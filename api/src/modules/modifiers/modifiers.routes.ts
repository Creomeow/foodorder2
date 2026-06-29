import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { modifierGroupCreateSchema, modifierGroupUpdateSchema, Role } from '@foodorder/shared';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { assertCanAccessRestaurant, restaurantScopeWhere } from '../../lib/tenant.js';
import { audit } from '../../lib/audit.js';
import { notFound } from '../../lib/errors.js';

export const modifiersRouter = Router();
modifiersRouter.use(requireAuth);

const GROUP_INCLUDE = {
  options: { orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.ModifierGroupInclude;

modifiersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const restaurantId = req.query.restaurantId as string | undefined;
    const groups = await prisma.modifierGroup.findMany({
      where: restaurantScopeWhere(req.user!, restaurantId),
      include: GROUP_INCLUDE,
      orderBy: { name: 'asc' },
    });
    ok(res, groups);
  }),
);

modifiersRouter.post(
  '/',
  requireRole(Role.SUPER_ADMIN, Role.MANAGER),
  validate(modifierGroupCreateSchema),
  asyncHandler(async (req, res) => {
    const { options = [], ...data } = req.body as Record<string, any>;
    await assertCanAccessRestaurant(req.user!, data.restaurantId);
    const group = await prisma.modifierGroup.create({
      data: {
        ...data,
        options: {
          create: options.map((o: any, i: number) => ({
            name: o.name,
            price: o.price ?? 0,
            isDefault: o.isDefault ?? false,
            sortOrder: o.sortOrder ?? i,
          })),
        },
      } as Prisma.ModifierGroupUncheckedCreateInput,
      include: GROUP_INCLUDE,
    });
    await audit(req.user, 'CREATE', 'ModifierGroup', group.id);
    ok(res, group, 201);
  }),
);

modifiersRouter.put(
  '/:id',
  requireRole(Role.SUPER_ADMIN, Role.MANAGER),
  validate(modifierGroupUpdateSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.modifierGroup.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Modifier group not found');
    await assertCanAccessRestaurant(req.user!, existing.restaurantId);

    const { options, ...data } = req.body as Record<string, any>;
    const group = await prisma.$transaction(async (tx) => {
      if (Array.isArray(options)) {
        // Replace the option set wholesale (simplest correct behaviour for edits).
        await tx.modifierOption.deleteMany({ where: { modifierGroupId: req.params.id } });
        await tx.modifierOption.createMany({
          data: options.map((o: any, i: number) => ({
            modifierGroupId: req.params.id,
            name: o.name,
            price: o.price ?? 0,
            isDefault: o.isDefault ?? false,
            sortOrder: o.sortOrder ?? i,
          })),
        });
      }
      return tx.modifierGroup.update({ where: { id: req.params.id }, data, include: GROUP_INCLUDE });
    });
    await audit(req.user, 'UPDATE', 'ModifierGroup', group.id);
    ok(res, group);
  }),
);

modifiersRouter.delete(
  '/:id',
  requireRole(Role.SUPER_ADMIN, Role.MANAGER),
  asyncHandler(async (req, res) => {
    const existing = await prisma.modifierGroup.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Modifier group not found');
    await assertCanAccessRestaurant(req.user!, existing.restaurantId);
    await prisma.modifierGroup.delete({ where: { id: req.params.id } });
    await audit(req.user, 'DELETE', 'ModifierGroup', req.params.id);
    res.json({ success: true });
  }),
);
