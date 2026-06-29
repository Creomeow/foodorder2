import { Router } from 'express';
import { z } from 'zod';
import { Role, LoyaltyTxnType } from '@foodorder/shared';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { audit } from '../../lib/audit.js';

export const loyaltyRouter = Router();
loyaltyRouter.use(requireAuth, requireRole(Role.SUPER_ADMIN, Role.MANAGER));

function brandWhere(user: { role: Role; brandId: string | null }) {
  return user.role === Role.SUPER_ADMIN ? {} : { brandId: user.brandId ?? '__none__' };
}

loyaltyRouter.get(
  '/accounts',
  asyncHandler(async (req, res) => {
    const accounts = await prisma.loyaltyAccount.findMany({
      where: brandWhere(req.user!),
      include: { customer: true, _count: { select: { transactions: true } } },
      orderBy: { points: 'desc' },
    });
    ok(res, accounts);
  }),
);

loyaltyRouter.get(
  '/accounts/:id',
  asyncHandler(async (req, res) => {
    const account = await prisma.loyaltyAccount.findUnique({
      where: { id: req.params.id },
      include: { customer: true, transactions: { orderBy: { createdAt: 'desc' }, take: 50 } },
    });
    if (!account) throw notFound('Loyalty account not found');
    ok(res, account);
  }),
);

const adjustSchema = z.object({
  customerId: z.string(),
  brandId: z.string(),
  points: z.number().int().positive(),
  type: z.enum([LoyaltyTxnType.EARN, LoyaltyTxnType.REDEEM]),
  orderId: z.string().optional().nullable(),
});

// Earn or redeem points (manual adjustment / order reward).
loyaltyRouter.post(
  '/adjust',
  validate(adjustSchema),
  asyncHandler(async (req, res) => {
    const { customerId, brandId, points, type, orderId } = req.body as z.infer<typeof adjustSchema>;
    const delta = type === LoyaltyTxnType.REDEEM ? -points : points;

    const account = await prisma.loyaltyAccount.upsert({
      where: { customerId },
      create: { customerId, brandId, points: Math.max(0, delta) },
      update: {},
    });

    if (type === LoyaltyTxnType.REDEEM && account.points < points) {
      throw badRequest('Insufficient points');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const acct = await tx.loyaltyAccount.update({
        where: { id: account.id },
        data: { points: { increment: delta } },
      });
      await tx.loyaltyTransaction.create({
        data: { accountId: account.id, points: delta, type, orderId: orderId ?? null },
      });
      return acct;
    });

    await audit(req.user, 'LOYALTY_ADJUST', 'LoyaltyAccount', account.id, { delta });
    ok(res, updated);
  }),
);
