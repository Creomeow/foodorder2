import { OrderStatus } from '@foodorder/shared';
import { prisma } from '../../lib/prisma.js';
import type { JwtPayload } from '../../lib/jwt.js';
import { restaurantScopeWhere } from '../../lib/tenant.js';

const COUNTED = { not: OrderStatus.CANCELLED as OrderStatus };

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function dashboardStats(user: JwtPayload, restaurantId?: string) {
  const scope = restaurantScopeWhere(user, restaurantId);
  const today = startOfToday();

  const [todayAgg, activeOrders, completedOrders] = await Promise.all([
    prisma.order.aggregate({
      where: { ...scope, status: COUNTED, createdAt: { gte: today } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.count({
      where: {
        ...scope,
        status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY] },
      },
    }),
    prisma.order.count({
      where: { ...scope, status: OrderStatus.COMPLETED, createdAt: { gte: today } },
    }),
  ]);

  const revenue = Number(todayAgg._sum.total ?? 0);
  const orders = todayAgg._count;
  return {
    todayRevenue: revenue,
    todayOrders: orders,
    averageOrderValue: orders > 0 ? revenue / orders : 0,
    activeOrders,
    completedOrders,
  };
}

function rangeFor(period: string, from?: string, to?: string) {
  const end = to ? new Date(to) : new Date();
  let start: Date;
  if (from) {
    start = new Date(from);
  } else {
    start = new Date(end);
    if (period === 'daily') start.setDate(end.getDate() - 30);
    else if (period === 'weekly') start.setDate(end.getDate() - 7 * 12);
    else if (period === 'monthly') start.setMonth(end.getMonth() - 12);
    else start.setFullYear(end.getFullYear() - 5);
  }
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function bucketKey(date: Date, period: string): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  if (period === 'yearly') return `${y}`;
  if (period === 'monthly') return `${y}-${m}`;
  if (period === 'weekly') {
    const onejan = new Date(y, 0, 1);
    const week = Math.ceil(((date.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
    return `${y}-W${String(week).padStart(2, '0')}`;
  }
  return `${y}-${m}-${d}`;
}

export async function salesReport(
  user: JwtPayload,
  period: string,
  restaurantId?: string,
  from?: string,
  to?: string,
) {
  const scope = restaurantScopeWhere(user, restaurantId);
  const { start, end } = rangeFor(period, from, to);
  const orders = await prisma.order.findMany({
    where: { ...scope, status: COUNTED, createdAt: { gte: start, lte: end } },
    select: { total: true, createdAt: true },
  });

  const buckets = new Map<string, { orders: number; revenue: number }>();
  for (const o of orders) {
    const key = bucketKey(o.createdAt, period);
    const b = buckets.get(key) ?? { orders: 0, revenue: 0 };
    b.orders += 1;
    b.revenue += Number(o.total);
    buckets.set(key, b);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, v]) => ({ label, orders: v.orders, revenue: Number(v.revenue.toFixed(2)) }));
}

export async function productReport(
  user: JwtPayload,
  restaurantId?: string,
  from?: string,
  to?: string,
) {
  const scope = restaurantScopeWhere(user, restaurantId);
  const { start, end } = rangeFor('monthly', from, to);
  const items = await prisma.orderItem.findMany({
    where: { order: { ...scope, status: COUNTED, createdAt: { gte: start, lte: end } } },
    select: {
      menuItemId: true,
      name: true,
      quantity: true,
      unitPrice: true,
      menuItem: { select: { category: { select: { name: true } } } },
    },
  });

  const map = new Map<string, { name: string; category: string; quantitySold: number; revenue: number }>();
  for (const it of items) {
    const row =
      map.get(it.menuItemId) ??
      { name: it.name, category: it.menuItem?.category?.name ?? '—', quantitySold: 0, revenue: 0 };
    row.quantitySold += it.quantity;
    row.revenue += it.quantity * Number(it.unitPrice);
    map.set(it.menuItemId, row);
  }

  return [...map.entries()]
    .map(([menuItemId, v]) => ({ menuItemId, ...v, revenue: Number(v.revenue.toFixed(2)) }))
    .sort((a, b) => b.quantitySold - a.quantitySold);
}

// Revenue grouped by category (for the analytics charts).
export async function categoryReport(user: JwtPayload, restaurantId?: string) {
  const products = await productReport(user, restaurantId);
  const map = new Map<string, number>();
  for (const p of products) {
    map.set(p.category, (map.get(p.category) ?? 0) + p.revenue);
  }
  return [...map.entries()].map(([label, revenue]) => ({
    label,
    revenue: Number(revenue.toFixed(2)),
  }));
}
