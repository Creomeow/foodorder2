import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { menuItemCreateSchema, menuItemUpdateSchema, Role } from '@foodorder/shared';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { assertCanAccessRestaurant, restaurantScopeWhere } from '../../lib/tenant.js';
import { audit } from '../../lib/audit.js';
import { notFound } from '../../lib/errors.js';

export const menuRouter = Router();
menuRouter.use(requireAuth);

const ITEM_INCLUDE = {
  modifierGroups: {
    orderBy: { sortOrder: 'asc' },
    include: { modifierGroup: { include: { options: { orderBy: { sortOrder: 'asc' } } } } },
  },
} satisfies Prisma.MenuItemInclude;

// Flatten the join-table shape into a clean modifierGroups[] array.
function shapeItem(item: Record<string, any>) {
  return {
    ...item,
    modifierGroups: (item.modifierGroups ?? []).map((link: any) => link.modifierGroup),
  };
}

menuRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const restaurantId = req.query.restaurantId as string | undefined;
    const categoryId = req.query.categoryId as string | undefined;
    const items = await prisma.menuItem.findMany({
      where: { ...restaurantScopeWhere(req.user!, restaurantId), ...(categoryId ? { categoryId } : {}) },
      include: ITEM_INCLUDE,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    ok(res, items.map(shapeItem));
  }),
);

menuRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const item = await prisma.menuItem.findUnique({
      where: { id: req.params.id },
      include: ITEM_INCLUDE,
    });
    if (!item) throw notFound('Menu item not found');
    ok(res, shapeItem(item));
  }),
);

menuRouter.post(
  '/',
  requireRole(Role.SUPER_ADMIN, Role.MANAGER),
  validate(menuItemCreateSchema),
  asyncHandler(async (req, res) => {
    const { modifierGroupIds = [], ...data } = req.body as Record<string, any>;
    await assertCanAccessRestaurant(req.user!, data.restaurantId);
    const item = await prisma.menuItem.create({
      data: {
        ...data,
        modifierGroups: {
          create: modifierGroupIds.map((mgId: string, i: number) => ({
            modifierGroupId: mgId,
            sortOrder: i,
          })),
        },
      } as Prisma.MenuItemUncheckedCreateInput,
      include: ITEM_INCLUDE,
    });
    await audit(req.user, 'CREATE', 'MenuItem', item.id);
    ok(res, shapeItem(item), 201);
  }),
);

menuRouter.put(
  '/:id',
  requireRole(Role.SUPER_ADMIN, Role.MANAGER),
  validate(menuItemUpdateSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.menuItem.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Menu item not found');
    await assertCanAccessRestaurant(req.user!, existing.restaurantId);

    const { modifierGroupIds, ...data } = req.body as Record<string, any>;
    const item = await prisma.$transaction(async (tx) => {
      if (Array.isArray(modifierGroupIds)) {
        await tx.menuItemModifierGroup.deleteMany({ where: { menuItemId: req.params.id } });
        await tx.menuItemModifierGroup.createMany({
          data: modifierGroupIds.map((mgId: string, i: number) => ({
            menuItemId: req.params.id,
            modifierGroupId: mgId,
            sortOrder: i,
          })),
        });
      }
      return tx.menuItem.update({ where: { id: req.params.id }, data, include: ITEM_INCLUDE });
    });
    await audit(req.user, 'UPDATE', 'MenuItem', item.id);
    ok(res, shapeItem(item));
  }),
);

menuRouter.delete(
  '/:id',
  requireRole(Role.SUPER_ADMIN, Role.MANAGER),
  asyncHandler(async (req, res) => {
    const existing = await prisma.menuItem.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Menu item not found');
    await assertCanAccessRestaurant(req.user!, existing.restaurantId);
    await prisma.menuItem.delete({ where: { id: req.params.id } });
    await audit(req.user, 'DELETE', 'MenuItem', req.params.id);
    res.json({ success: true });
  }),
);
