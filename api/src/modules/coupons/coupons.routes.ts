import { Router } from 'express';
import { couponCreateSchema, couponUpdateSchema, couponValidateSchema, Role } from '@foodorder/shared';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { audit } from '../../lib/audit.js';
import { applyCoupon } from './coupons.service.js';

export const couponsRouter = Router();

// Public coupon validation used at checkout (no auth).
couponsRouter.post(
  '/validate',
  validate(couponValidateSchema),
  asyncHandler(async (req, res) => {
    const { code, restaurantId, subtotal } = req.body as {
      code: string;
      restaurantId: string;
      subtotal: number;
    };
    const result = await applyCoupon(code, restaurantId, subtotal);
    ok(res, { valid: result.valid, discount: result.discount, message: result.message });
  }),
);

// Management endpoints (auth).
couponsRouter.use(requireAuth, requireRole(Role.SUPER_ADMIN, Role.MANAGER));

couponsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const where =
      user.role === Role.SUPER_ADMIN
        ? {}
        : {
            OR: [
              { brandId: user.brandId ?? '__none__' },
              { restaurant: { brandId: user.brandId ?? '__none__' } },
            ],
          };
    const coupons = await prisma.coupon.findMany({ where, orderBy: { createdAt: 'desc' } });
    ok(res, coupons);
  }),
);

couponsRouter.post(
  '/',
  validate(couponCreateSchema),
  asyncHandler(async (req, res) => {
    const coupon = await prisma.coupon.create({ data: req.body });
    await audit(req.user, 'CREATE', 'Coupon', coupon.id);
    ok(res, coupon, 201);
  }),
);

couponsRouter.put(
  '/:id',
  validate(couponUpdateSchema),
  asyncHandler(async (req, res) => {
    const coupon = await prisma.coupon.update({ where: { id: req.params.id }, data: req.body });
    await audit(req.user, 'UPDATE', 'Coupon', coupon.id);
    ok(res, coupon);
  }),
);

couponsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.coupon.delete({ where: { id: req.params.id } });
    await audit(req.user, 'DELETE', 'Coupon', req.params.id);
    res.json({ success: true });
  }),
);
