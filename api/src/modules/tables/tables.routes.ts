import { Router } from 'express';
import { tableCreateSchema, tableUpdateSchema, Role } from '@foodorder/shared';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { assertCanAccessRestaurant, restaurantScopeWhere } from '../../lib/tenant.js';
import { audit } from '../../lib/audit.js';
import { notFound } from '../../lib/errors.js';
import { token } from '../../lib/ids.js';
import { qrDataUrl, qrSvg, tableUrl } from '../../lib/qr.js';

export const tablesRouter = Router();
tablesRouter.use(requireAuth);

function withUrl<T extends { qrToken: string }>(t: T) {
  return { ...t, qrUrl: tableUrl(t.qrToken) };
}

tablesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const restaurantId = req.query.restaurantId as string | undefined;
    const tables = await prisma.table.findMany({
      where: restaurantScopeWhere(req.user!, restaurantId),
      orderBy: { tableNumber: 'asc' },
    });
    ok(res, tables.map(withUrl));
  }),
);

tablesRouter.post(
  '/',
  requireRole(Role.SUPER_ADMIN, Role.MANAGER),
  validate(tableCreateSchema),
  asyncHandler(async (req, res) => {
    await assertCanAccessRestaurant(req.user!, req.body.restaurantId);
    const table = await prisma.table.create({ data: { ...req.body, qrToken: token() } });
    await audit(req.user, 'CREATE', 'Table', table.id);
    ok(res, withUrl(table), 201);
  }),
);

tablesRouter.put(
  '/:id',
  requireRole(Role.SUPER_ADMIN, Role.MANAGER),
  validate(tableUpdateSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.table.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Table not found');
    await assertCanAccessRestaurant(req.user!, existing.restaurantId);
    const table = await prisma.table.update({ where: { id: req.params.id }, data: req.body });
    await audit(req.user, 'UPDATE', 'Table', table.id);
    ok(res, withUrl(table));
  }),
);

tablesRouter.delete(
  '/:id',
  requireRole(Role.SUPER_ADMIN, Role.MANAGER),
  asyncHandler(async (req, res) => {
    const existing = await prisma.table.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Table not found');
    await assertCanAccessRestaurant(req.user!, existing.restaurantId);
    await prisma.table.delete({ where: { id: req.params.id } });
    await audit(req.user, 'DELETE', 'Table', req.params.id);
    res.json({ success: true });
  }),
);

// Regenerate a table's QR token (invalidates the old printed code).
tablesRouter.post(
  '/:id/qr/regenerate',
  requireRole(Role.SUPER_ADMIN, Role.MANAGER),
  asyncHandler(async (req, res) => {
    const existing = await prisma.table.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Table not found');
    await assertCanAccessRestaurant(req.user!, existing.restaurantId);
    const table = await prisma.table.update({
      where: { id: req.params.id },
      data: { qrToken: token() },
    });
    await audit(req.user, 'REGENERATE_QR', 'Table', table.id);
    ok(res, withUrl(table));
  }),
);

// QR image (PNG data URL or SVG) for download/print.
tablesRouter.get(
  '/:id/qr',
  asyncHandler(async (req, res) => {
    const table = await prisma.table.findUnique({ where: { id: req.params.id } });
    if (!table) throw notFound('Table not found');
    await assertCanAccessRestaurant(req.user!, table.restaurantId);
    const format = (req.query.format as string) ?? 'dataurl';
    if (format === 'svg') {
      res.type('image/svg+xml').send(await qrSvg(table.qrToken));
      return;
    }
    ok(res, { dataUrl: await qrDataUrl(table.qrToken), url: tableUrl(table.qrToken) });
  }),
);
