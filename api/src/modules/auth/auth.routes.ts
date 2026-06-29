import { Router } from 'express';
import { loginSchema, refreshSchema, Role } from '@foodorder/shared';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok } from '../../lib/http.js';
import { verifyPassword } from '../../lib/password.js';
import { unauthorized } from '../../lib/errors.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type JwtPayload,
} from '../../lib/jwt.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { audit } from '../../lib/audit.js';

export const authRouter = Router();

function tokensFor(user: {
  id: string;
  role: Role;
  brandId: string | null;
  restaurantId: string | null;
}) {
  const payload: JwtPayload = {
    sub: user.id,
    role: user.role,
    brandId: user.brandId,
    restaurantId: user.restaurantId,
  };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

authRouter.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email: string; password: string };
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) throw unauthorized('Invalid credentials');

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) throw unauthorized('Invalid credentials');

    const tokens = tokensFor(user);
    await audit({ sub: user.id, role: user.role, brandId: user.brandId, restaurantId: user.restaurantId }, 'LOGIN', 'User', user.id);

    ok(res, {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        brandId: user.brandId,
        restaurantId: user.restaurantId,
      },
    });
  }),
);

authRouter.post(
  '/refresh',
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body as { refreshToken: string };
    let payload: JwtPayload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw unauthorized('Invalid refresh token');
    }
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active) throw unauthorized('User no longer active');
    ok(res, tokensFor(user));
  }),
);

authRouter.post('/logout', (_req, res) => {
  // Stateless JWT: client discards tokens. Endpoint exists for symmetry/auditing.
  res.json({ success: true });
});

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) throw unauthorized();
    ok(res, {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      brandId: user.brandId,
      restaurantId: user.restaurantId,
    });
  }),
);
