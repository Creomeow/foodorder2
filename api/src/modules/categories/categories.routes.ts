import { Router } from 'express';
import { categoryCreateSchema, categoryUpdateSchema, Role } from '@foodorder/shared';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { assertCanAccessRestaurant, restaurantScopeWhere } from '../../lib/tenant.js';
import { audit } from '../../lib/audit.js';
import { badRequest, notFound } from '../../lib/errors.js';

export const categoriesRouter = Router();
categoriesRouter.use(requireAuth);

categoriesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const restaurantId = req.query.restaurantId as string | undefined;
    const categories = await prisma.category.findMany({
      where: restaurantScopeWhere(req.user!, restaurantId),
      orderBy: { sortOrder: 'asc' },
    });
    ok(res, categories);
  }),
);

categoriesRouter.post(
  '/',
  requireRole(Role.SUPER_ADMIN, Role.MANAGER),
  validate(categoryCreateSchema),
  asyncHandler(async (req, res) => {
    await assertCanAccessRestaurant(req.user!, req.body.restaurantId);
    const category = await prisma.category.create({ data: req.body });
    await audit(req.user, 'CREATE', 'Category', category.id);
    ok(res, category, 201);
  }),
);

categoriesRouter.put(
  '/:id',
  requireRole(Role.SUPER_ADMIN, Role.MANAGER),
  validate(categoryUpdateSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Category not found');
    await assertCanAccessRestaurant(req.user!, existing.restaurantId);
    const category = await prisma.category.update({ where: { id: req.params.id }, data: req.body });
    await audit(req.user, 'UPDATE', 'Category', category.id);
    ok(res, category);
  }),
);

categoriesRouter.delete(
  '/:id',
  requireRole(Role.SUPER_ADMIN, Role.MANAGER),
  asyncHandler(async (req, res) => {
    const existing = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { menuItems: true } } },
    });
    if (!existing) throw notFound('Category not found');
    await assertCanAccessRestaurant(req.user!, existing.restaurantId);
    if (existing._count.menuItems > 0) throw badRequest('Remove menu items in this category first');
    await prisma.category.delete({ where: { id: req.params.id } });
    await audit(req.user, 'DELETE', 'Category', req.params.id);
    res.json({ success: true });
  }),
);
