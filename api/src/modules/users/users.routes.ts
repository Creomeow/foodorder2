import { Router } from 'express';
import { userCreateSchema, userUpdateSchema, Role } from '@foodorder/shared';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { hashPassword } from '../../lib/password.js';
import { audit } from '../../lib/audit.js';
import { badRequest, forbidden, notFound } from '../../lib/errors.js';
import type { JwtPayload } from '../../lib/jwt.js';

export const usersRouter = Router();
usersRouter.use(requireAuth, requireRole(Role.SUPER_ADMIN, Role.MANAGER));

const SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  brandId: true,
  restaurantId: true,
  active: true,
  createdAt: true,
} as const;

function scopeForManager(user: JwtPayload) {
  return user.role === Role.MANAGER ? { brandId: user.brandId ?? '__none__' } : {};
}

// A manager may not create super admins or users outside their brand.
function assertManagerCanAssign(user: JwtPayload, body: { role: Role; brandId?: string | null }) {
  if (user.role !== Role.MANAGER) return;
  if (body.role === Role.SUPER_ADMIN) throw forbidden('Cannot create super admin');
  if (body.brandId && body.brandId !== user.brandId) throw forbidden('Outside your brand');
}

usersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      where: scopeForManager(req.user!),
      select: SAFE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    ok(res, users);
  }),
);

usersRouter.post(
  '/',
  validate(userCreateSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as typeof req.body & { role: Role };
    assertManagerCanAssign(req.user!, body);
    // Managers default new users to their own brand.
    const brandId =
      req.user!.role === Role.MANAGER ? req.user!.brandId : (body.brandId ?? null);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) throw badRequest('Email already in use');

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash: await hashPassword(body.password),
        role: body.role,
        brandId,
        restaurantId: body.restaurantId ?? null,
      },
      select: SAFE_SELECT,
    });
    await audit(req.user, 'CREATE', 'User', user.id);
    ok(res, user, 201);
  }),
);

usersRouter.put(
  '/:id',
  validate(userUpdateSchema),
  asyncHandler(async (req, res) => {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw notFound('User not found');
    if (req.user!.role === Role.MANAGER && target.brandId !== req.user!.brandId) {
      throw forbidden('Outside your brand');
    }
    const body = req.body as Record<string, unknown> & { password?: string; role?: Role };
    assertManagerCanAssign(req.user!, { role: body.role ?? target.role, brandId: body.brandId as string });

    const data: Record<string, unknown> = { ...body };
    delete data.password;
    if (body.password) data.passwordHash = await hashPassword(body.password);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: SAFE_SELECT,
    });
    await audit(req.user, 'UPDATE', 'User', user.id);
    ok(res, user);
  }),
);

usersRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user!.sub) throw badRequest('Cannot delete yourself');
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw notFound('User not found');
    if (req.user!.role === Role.MANAGER && target.brandId !== req.user!.brandId) {
      throw forbidden('Outside your brand');
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    await audit(req.user, 'DELETE', 'User', req.params.id);
    res.json({ success: true });
  }),
);
