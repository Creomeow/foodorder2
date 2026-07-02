import { Prisma } from '@prisma/client';
import { OrderType, type OrderCreateInput } from '@foodorder/shared';
import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { applyCoupon } from '../coupons/coupons.service.js';

const D = (n: number | string | Prisma.Decimal) => new Prisma.Decimal(n);
const round2 = (d: Prisma.Decimal) => d.toDecimalPlaces(2);

export const ORDER_INCLUDE = {
  items: { include: { modifiers: true } },
  payments: true,
  table: { select: { tableNumber: true } },
} satisfies Prisma.OrderInclude;

/** Build a human-friendly order number, sequential per outlet per day. */
async function nextOrderNumber(
  tx: Prisma.TransactionClient,
  restaurantId: string,
): Promise<string> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const count = await tx.order.count({
    where: { restaurantId, createdAt: { gte: start } },
  });
  const seq = String(count + 1).padStart(3, '0');
  const dd = String(start.getDate()).padStart(2, '0');
  const mm = String(start.getMonth() + 1).padStart(2, '0');
  return `${mm}${dd}-${seq}`;
}

/**
 * Validate an order payload against the live menu, compute totals (server-side —
 * never trust client prices), persist it, and return the full order.
 */
export async function createOrder(input: OrderCreateInput) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: input.restaurantId },
  });
  if (!restaurant) throw notFound('Outlet not found');

  if (input.orderType === OrderType.TAKEAWAY) {
    if (!input.customerName || !input.customerPhone) {
      throw badRequest('Name and phone are required for takeaway');
    }
  }

  // Load all referenced menu items + their allowed modifier options in one go.
  const menuItemIds = input.items.map((i) => i.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds }, restaurantId: input.restaurantId },
    include: { modifierGroups: { include: { modifierGroup: { include: { options: true } } } } },
  });
  const menuById = new Map(menuItems.map((m) => [m.id, m]));

  // Build line items with snapshotted prices/names.
  let subtotal = D(0);
  const itemsData = input.items.map((line) => {
    const menuItem = menuById.get(line.menuItemId);
    if (!menuItem) throw badRequest(`Menu item ${line.menuItemId} unavailable`);
    if (!menuItem.available) throw badRequest(`${menuItem.name} is currently unavailable`);

    const allowedOptions = new Map(
      menuItem.modifierGroups.flatMap((g) => g.modifierGroup.options.map((o) => [o.id, o])),
    );

    const modifiers = line.modifiers.map((m) => {
      const opt = allowedOptions.get(m.modifierOptionId);
      if (!opt) throw badRequest(`Invalid modifier for ${menuItem.name}`);
      return { modifierOptionId: opt.id, name: opt.name, price: opt.price };
    });

    const modSum = modifiers.reduce((acc, m) => acc.add(m.price), D(0));
    const unitPrice = round2(D(menuItem.price).add(modSum));
    subtotal = subtotal.add(unitPrice.mul(line.quantity));

    return {
      menuItemId: menuItem.id,
      name: menuItem.name,
      quantity: line.quantity,
      unitPrice,
      notes: line.notes ?? null,
      modifiers,
    };
  });

  subtotal = round2(subtotal);

  // Coupon discount (validated against this outlet/subtotal).
  let discount = D(0);
  let couponId: string | null = null;
  if (input.couponCode) {
    const result = await applyCoupon(input.couponCode, input.restaurantId, subtotal.toNumber());
    if (!result.valid) throw badRequest(result.message ?? 'Invalid coupon');
    discount = round2(D(result.discount));
    couponId = result.couponId;
  }

  const taxable = subtotal.sub(discount);
  const tax = round2(taxable.mul(D(restaurant.taxRate)).div(100));
  const serviceCharge = round2(taxable.mul(D(restaurant.serviceCharge)).div(100));
  const total = round2(taxable.add(tax).add(serviceCharge));

  const order = await prisma.$transaction(async (tx) => {
    // Resolve / link a customer record when contact details were given.
    let customerId: string | null = null;
    if (input.customerName || input.customerPhone) {
      const customer = await tx.customer.create({
        data: { name: input.customerName ?? null, phone: input.customerPhone ?? null },
      });
      customerId = customer.id;
    }

    const orderNumber = await nextOrderNumber(tx, input.restaurantId);

    const created = await tx.order.create({
      data: {
        restaurantId: input.restaurantId,
        orderNumber,
        orderType: input.orderType as Prisma.OrderUncheckedCreateInput['orderType'],
        tableId: input.tableId ?? null,
        sessionId: input.sessionId ?? null,
        customerId,
        customerName: input.customerName ?? null,
        customerPhone: input.customerPhone ?? null,
        subtotal,
        tax,
        serviceCharge,
        discount,
        total,
        couponId,
        scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
        items: {
          create: itemsData.map((it) => ({
            menuItemId: it.menuItemId,
            name: it.name,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            notes: it.notes,
            modifiers: { create: it.modifiers },
          })),
        },
      },
      include: ORDER_INCLUDE,
    });

    if (couponId) {
      await tx.coupon.update({
        where: { id: couponId },
        data: { redeemedCount: { increment: 1 } },
      });
    }
    if (input.tableId) {
      await tx.table.update({ where: { id: input.tableId }, data: { status: 'OCCUPIED' } });
    }

    return created;
  });

  return order;
}
