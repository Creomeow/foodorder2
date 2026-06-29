import { Router } from 'express';
import { brandCreateSchema, brandUpdateSchema, Role } from '@foodorder/shared';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { brandScopeWhere } from '../../lib/tenant.js';
import { audit } from '../../lib/audit.js';
import { forbidden } from '../../lib/errors.js';

export const brandsRouter = Router();
brandsRouter.use(requireAuth);

// List brands visible to the user.
brandsRouter.get(
  '/',
  requireRole(Role.SUPER_ADMIN, Role.MANAGER),
  asyncHandler(async (req, res) => {
    const brands = await prisma.brand.findMany({
      where: brandScopeWhere(req.user!),
      include: { _count: { select: { restaurants: true } } },
      orderBy: { createdAt: 'asc' },
    });
    ok(res, brands);
  }),
);

brandsRouter.post(
  '/',
  requireRole(Role.SUPER_ADMIN),
  validate(brandCreateSchema),
  asyncHandler(async (req, res) => {
    const brand = await prisma.brand.create({ data: req.body });
    await audit(req.user, 'CREATE', 'Brand', brand.id);
    ok(res, brand, 201);
  }),
);

brandsRouter.put(
  '/:id',
  requireRole(Role.SUPER_ADMIN, Role.MANAGER),
  validate(brandUpdateSchema),
  asyncHandler(async (req, res) => {
    if (req.user!.role === Role.MANAGER && req.user!.brandId !== req.params.id) {
      throw forbidden('Not your brand');
    }
    const brand = await prisma.brand.update({ where: { id: req.params.id }, data: req.body });
    await audit(req.user, 'UPDATE', 'Brand', brand.id);
    ok(res, brand);
  }),
);

brandsRouter.delete(
  '/:id',
  requireRole(Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.brand.delete({ where: { id: req.params.id } });
    await audit(req.user, 'DELETE', 'Brand', req.params.id);
    res.json({ success: true });
  }),
);
