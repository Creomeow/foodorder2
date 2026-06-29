import { Router } from 'express';
import {
  orderCreateSchema,
  orderStatusUpdateSchema,
  paginationQuery,
  OrderStatus,
  Role,
} from '@foodorder/shared';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok, serialize } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { restaurantScopeWhere, assertCanAccessRestaurant } from '../../lib/tenant.js';
import { paginate, pageResult } from '../../lib/pagination.js';
import { notFound } from '../../lib/errors.js';
import { audit } from '../../lib/audit.js';
import { emitOrderNew, emitOrderStatus } from '../../realtime/io.js';
import { createOrder, ORDER_INCLUDE } from './orders.service.js';

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

// List/search/filter orders (staff dashboard + KDS source).
ordersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, pageSize } = paginationQuery.parse(req.query);
    const restaurantId = req.query.restaurantId as string | undefined;
    const status = req.query.status as OrderStatus | undefined;
    const search = (req.query.search as string | undefined)?.trim();

    const where: Record<string, unknown> = {
      ...restaurantScopeWhere(req.user!, restaurantId),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search, mode: 'insensitive' } },
              { customerName: { contains: search, mode: 'insensitive' } },
              { customerPhone: { contains: search } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        ...paginate({ page, pageSize }),
      }),
      prisma.order.count({ where }),
    ]);
    res.json(serialize(pageResult(data, total, { page, pageSize })));
  }),
);

ordersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: ORDER_INCLUDE,
    });
    if (!order) throw notFound('Order not found');
    await assertCanAccessRestaurant(req.user!, order.restaurantId);
    ok(res, order);
  }),
);

// Staff-created order (e.g. POS / phone order).
ordersRouter.post(
  '/',
  validate(orderCreateSchema),
  asyncHandler(async (req, res) => {
    await assertCanAccessRestaurant(req.user!, req.body.restaurantId);
    const order = await createOrder(req.body);
    await audit(req.user, 'CREATE', 'Order', order.id);
    emitOrderNew(order.restaurantId, serialize(order));
    ok(res, order, 201);
  }),
);

// Status progression (KDS / order management).
ordersRouter.patch(
  '/:id/status',
  validate(orderStatusUpdateSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Order not found');
    await assertCanAccessRestaurant(req.user!, existing.restaurantId);

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
      include: ORDER_INCLUDE,
    });

    // Free the table when a dine-in order is fully done.
    if (
      order.tableId &&
      (req.body.status === OrderStatus.COMPLETED || req.body.status === OrderStatus.CANCELLED)
    ) {
      const openOrders = await prisma.order.count({
        where: {
          tableId: order.tableId,
          status: { notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED] },
        },
      });
      if (openOrders === 0) {
        await prisma.table.update({ where: { id: order.tableId }, data: { status: 'AVAILABLE' } });
      }
    }

    await audit(req.user, 'STATUS', 'Order', order.id, { status: req.body.status });
    emitOrderStatus(order.restaurantId, serialize(order));
    ok(res, order);
  }),
);
