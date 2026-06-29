import { z } from 'zod';
import {
  Role,
  OrderType,
  OrderStatus,
  TableStatus,
  PaymentMethod,
  CouponType,
} from './enums.js';

// ---- Reusable primitives ----
export const idSchema = z.string().min(1);
export const moneySchema = z.number().nonnegative();

const enumValues = <T extends Record<string, string>>(obj: T) =>
  Object.values(obj) as [string, ...string[]];

// ---- Auth ----
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

// ---- Brand ----
export const brandCreateSchema = z.object({
  name: z.string().min(1),
  logo: z.string().url().optional().nullable(),
});
export const brandUpdateSchema = brandCreateSchema.partial();
export type BrandCreateInput = z.infer<typeof brandCreateSchema>;

// ---- Restaurant (outlet) ----
export const operatingHoursSchema = z
  .array(
    z.object({
      day: z.number().int().min(0).max(6),
      open: z.string(), // "09:00"
      close: z.string(), // "22:00"
      closed: z.boolean().default(false),
    }),
  )
  .optional();

export const restaurantCreateSchema = z.object({
  brandId: idSchema,
  name: z.string().min(1),
  logo: z.string().url().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  taxRate: z.number().min(0).max(100).default(0),
  serviceCharge: z.number().min(0).max(100).default(0),
  currency: z.string().length(3).default('SGD'),
  operatingHours: operatingHoursSchema,
  paymentMethods: z.array(z.enum(enumValues(PaymentMethod))).default(['CASH', 'CARD']),
});
export const restaurantUpdateSchema = restaurantCreateSchema.partial().omit({ brandId: true });
export type RestaurantCreateInput = z.infer<typeof restaurantCreateSchema>;

// ---- User ----
export const userCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(enumValues(Role)),
  brandId: idSchema.optional().nullable(),
  restaurantId: idSchema.optional().nullable(),
});
export const userUpdateSchema = userCreateSchema.partial().extend({
  password: z.string().min(6).optional(),
});
export type UserCreateInput = z.infer<typeof userCreateSchema>;

// ---- Category ----
export const categoryCreateSchema = z.object({
  restaurantId: idSchema,
  name: z.string().min(1),
  sortOrder: z.number().int().default(0),
  visible: z.boolean().default(true),
});
export const categoryUpdateSchema = categoryCreateSchema.partial().omit({ restaurantId: true });
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;

// ---- Modifier groups / options ----
export const modifierOptionSchema = z.object({
  id: idSchema.optional(),
  name: z.string().min(1),
  price: moneySchema.default(0),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const modifierGroupCreateSchema = z.object({
  restaurantId: idSchema,
  name: z.string().min(1),
  required: z.boolean().default(false),
  multiple: z.boolean().default(false),
  minSelect: z.number().int().min(0).default(0),
  maxSelect: z.number().int().min(0).default(1),
  options: z.array(modifierOptionSchema).default([]),
});
export const modifierGroupUpdateSchema = modifierGroupCreateSchema
  .partial()
  .omit({ restaurantId: true });
export type ModifierGroupCreateInput = z.infer<typeof modifierGroupCreateSchema>;

// ---- Menu item ----
export const menuItemCreateSchema = z.object({
  restaurantId: idSchema,
  categoryId: idSchema,
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  price: moneySchema,
  imageUrl: z.string().optional().nullable(),
  available: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  popular: z.boolean().default(false),
  recommended: z.boolean().default(false),
  modifierGroupIds: z.array(idSchema).default([]),
});
export const menuItemUpdateSchema = menuItemCreateSchema.partial().omit({ restaurantId: true });
export type MenuItemCreateInput = z.infer<typeof menuItemCreateSchema>;

// ---- Table ----
export const tableCreateSchema = z.object({
  restaurantId: idSchema,
  tableNumber: z.string().min(1),
  capacity: z.number().int().min(1).default(2),
  status: z.enum(enumValues(TableStatus)).default('AVAILABLE'),
});
export const tableUpdateSchema = tableCreateSchema.partial().omit({ restaurantId: true });
export type TableCreateInput = z.infer<typeof tableCreateSchema>;

// ---- Public session ----
export const sessionCreateSchema = z.object({
  qrToken: z.string().min(1),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
});
export type SessionCreateInput = z.infer<typeof sessionCreateSchema>;

// ---- Order ----
export const orderItemModifierInput = z.object({
  modifierOptionId: idSchema,
});

export const orderItemInput = z.object({
  menuItemId: idSchema,
  quantity: z.number().int().min(1),
  notes: z.string().optional().nullable(),
  modifiers: z.array(orderItemModifierInput).default([]),
});

export const orderCreateSchema = z.object({
  restaurantId: idSchema,
  orderType: z.enum(enumValues(OrderType)),
  // Dine-in
  sessionId: idSchema.optional().nullable(),
  tableId: idSchema.optional().nullable(),
  // Customer (required for takeaway)
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  items: z.array(orderItemInput).min(1),
  couponCode: z.string().optional().nullable(),
});
export type OrderCreateInput = z.infer<typeof orderCreateSchema>;

export const orderStatusUpdateSchema = z.object({
  status: z.enum(enumValues(OrderStatus)),
});
export type OrderStatusUpdateInput = z.infer<typeof orderStatusUpdateSchema>;

// ---- Coupon ----
export const couponCreateSchema = z.object({
  restaurantId: idSchema.optional().nullable(),
  brandId: idSchema.optional().nullable(),
  code: z.string().min(1).toUpperCase(),
  type: z.enum(enumValues(CouponType)),
  value: moneySchema,
  minSpend: moneySchema.default(0),
  maxRedemptions: z.number().int().min(0).default(0), // 0 = unlimited
  validFrom: z.string().datetime().optional().nullable(),
  validTo: z.string().datetime().optional().nullable(),
  active: z.boolean().default(true),
});
export const couponUpdateSchema = couponCreateSchema.partial();
export type CouponCreateInput = z.infer<typeof couponCreateSchema>;

export const couponValidateSchema = z.object({
  code: z.string().min(1),
  restaurantId: idSchema,
  subtotal: moneySchema,
});
export type CouponValidateInput = z.infer<typeof couponValidateSchema>;

// ---- Payment ----
export const paymentIntentSchema = z.object({
  orderId: idSchema,
  method: z.enum(['CARD', 'PAYNOW', 'GRABPAY']),
});
export type PaymentIntentInput = z.infer<typeof paymentIntentSchema>;

export const cashPaymentSchema = z.object({
  orderId: idSchema,
});
export type CashPaymentInput = z.infer<typeof cashPaymentSchema>;

// ---- Reports ----
export const salesReportQuery = z.object({
  restaurantId: idSchema.optional(),
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).default('daily'),
  from: z.string().optional(),
  to: z.string().optional(),
});
export const exportQuery = salesReportQuery.extend({
  format: z.enum(['csv', 'xlsx', 'pdf']).default('csv'),
  report: z.enum(['sales', 'products']).default('sales'),
});

// ---- Pagination ----
export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
});
