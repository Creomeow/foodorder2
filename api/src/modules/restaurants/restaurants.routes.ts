import { Router } from 'express';
import { restaurantCreateSchema, restaurantUpdateSchema, Role } from '@foodorder/shared';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { assertCanAccessRestaurant } from '../../lib/tenant.js';
import { audit } from '../../lib/audit.js';
import { forbidden, notFound } from '../../lib/errors.js';

export const restaurantsRouter = Router();
restaurantsRouter.use(requireAuth);

// List outlets the user can see.
restaurantsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    let where: Record<string, unknown> = {};
    if (user.role === Role.MANAGER) where = { brandId: user.brandId ?? '__none__' };
    else if (user.role === Role.STAFF) where = { id: user.restaurantId ?? '__none__' };
    const restaurants = await prisma.restaurant.findMany({
      where,
      include: { brand: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    ok(res, restaurants);
  }),
);

restaurantsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    await assertCanAccessRestaurant(req.user!, req.params.id);
    const restaurant = await prisma.restaurant.findUnique({ where: { id: req.params.id } });
    if (!restaurant) throw notFound('Outlet not found');
    ok(res, restaurant);
  }),
);

restaurantsRouter.post(
  '/',
  requireRole(Role.SUPER_ADMIN, Role.MANAGER),
  validate(restaurantCreateSchema),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (user.role === Role.MANAGER && req.body.brandId !== user.brandId) {
      throw forbidden('Can only create outlets in your brand');
    }
    const restaurant = await prisma.restaurant.create({ data: req.body });
    await audit(user, 'CREATE', 'Restaurant', restaurant.id);
    ok(res, restaurant, 201);
  }),
);

restaurantsRouter.put(
  '/:id',
  requireRole(Role.SUPER_ADMIN, Role.MANAGER),
  validate(restaurantUpdateSchema),
  asyncHandler(async (req, res) => {
    await assertCanAccessRestaurant(req.user!, req.params.id);
    const restaurant = await prisma.restaurant.update({
      where: { id: req.params.id },
      data: req.body,
    });
    await audit(req.user, 'UPDATE', 'Restaurant', restaurant.id);
    ok(res, restaurant);
  }),
);

restaurantsRouter.delete(
  '/:id',
  requireRole(Role.SUPER_ADMIN, Role.MANAGER),
  asyncHandler(async (req, res) => {
    await assertCanAccessRestaurant(req.user!, req.params.id);
    await prisma.restaurant.delete({ where: { id: req.params.id } });
    await audit(req.user, 'DELETE', 'Restaurant', req.params.id);
    res.json({ success: true });
  }),
);
