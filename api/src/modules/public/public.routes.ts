import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { orderCreateSchema, sessionCreateSchema } from '@foodorder/shared';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok, serialize } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { emitOrderNew } from '../../realtime/io.js';
import { createOrder, ORDER_INCLUDE } from '../orders/orders.service.js';

// All routes here are PUBLIC (no auth) — used by the customer ordering web app.
export const publicRouter = Router();

const MENU_ITEM_INCLUDE = {
  modifierGroups: {
    orderBy: { sortOrder: 'asc' },
    include: { modifierGroup: { include: { options: { orderBy: { sortOrder: 'asc' } } } } },
  },
} satisfies Prisma.MenuItemInclude;

// Full menu for an outlet (categories + available items + modifiers).
publicRouter.get(
  '/outlet/:restaurantId/menu',
  asyncHandler(async (req, res) => {
    const restaurantId = req.params.restaurantId;
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) throw notFound('Outlet not found');

    const [categories, items] = await Promise.all([
      prisma.category.findMany({
        where: { restaurantId, visible: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.menuItem.findMany({
        where: { restaurantId, available: true },
        include: MENU_ITEM_INCLUDE,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
    ]);

    ok(res, {
      restaurant,
      categories,
      items: items.map((it) => ({
        ...it,
        modifierGroups: it.modifierGroups.map((l) => l.modifierGroup),
      })),
    });
  }),
);

// Active promotions for an outlet (used by the customer app's welcome screen).
publicRouter.get(
  '/outlet/:restaurantId/promotions',
  asyncHandler(async (req, res) => {
    const restaurantId = req.params.restaurantId;
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) throw notFound('Outlet not found');

    const now = new Date();
    const promotions = await prisma.promotion.findMany({
      where: {
        restaurantId,
        active: true,
        OR: [{ validFrom: null }, { validFrom: { lte: now } }],
        AND: [{ OR: [{ validTo: null }, { validTo: { gte: now } }] }],
      },
      orderBy: { createdAt: 'desc' },
    });

    ok(res, promotions);
  }),
);

// Resolve a QR token -> table + outlet, opening a dine-in session.
publicRouter.post(
  '/sessions',
  validate(sessionCreateSchema),
  asyncHandler(async (req, res) => {
    const { qrToken, customerName, customerPhone } = req.body as {
      qrToken: string;
      customerName?: string;
      customerPhone?: string;
    };
    const table = await prisma.table.findUnique({
      where: { qrToken },
      include: { restaurant: true },
    });
    if (!table) throw notFound('Invalid QR code');

    // Reuse an open session for the table if one exists, else open a new one.
    let session = await prisma.tableSession.findFirst({
      where: { tableId: table.id, closedAt: null },
      orderBy: { openedAt: 'desc' },
    });
    if (!session) {
      let customerId: string | null = null;
      if (customerName || customerPhone) {
        const c = await prisma.customer.create({
          data: { name: customerName ?? null, phone: customerPhone ?? null },
        });
        customerId = c.id;
      }
      session = await prisma.tableSession.create({
        data: { tableId: table.id, customerId },
      });
      await prisma.table.update({ where: { id: table.id }, data: { status: 'OCCUPIED' } });
    }

    ok(res, {
      sessionId: session.id,
      table: { id: table.id, tableNumber: table.tableNumber },
      restaurant: serialize(table.restaurant),
    });
  }),
);

// Place an order from the customer app.
publicRouter.post(
  '/orders',
  validate(orderCreateSchema),
  asyncHandler(async (req, res) => {
    const order = await createOrder(req.body);
    emitOrderNew(order.restaurantId, serialize(order));
    ok(res, order, 201);
  }),
);

// Track a single order (customer polls / subscribes via socket too).
publicRouter.get(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: ORDER_INCLUDE,
    });
    if (!order) throw notFound('Order not found');
    ok(res, order);
  }),
);

// List orders for a session (dine-in: multiple orders merged in one session).
publicRouter.get(
  '/sessions/:sessionId/orders',
  asyncHandler(async (req, res) => {
    const session = await prisma.tableSession.findUnique({ where: { id: req.params.sessionId } });
    if (!session) throw badRequest('Invalid session');
    const orders = await prisma.order.findMany({
      where: { sessionId: req.params.sessionId },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    ok(res, orders);
  }),
);
