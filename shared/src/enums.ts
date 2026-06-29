// Centralized enums shared across API and frontends.
// Keep in sync with prisma/schema.prisma enums.

export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  MANAGER: 'MANAGER',
  STAFF: 'STAFF',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const OrderType = {
  DINE_IN: 'DINE_IN',
  TAKEAWAY: 'TAKEAWAY',
} as const;
export type OrderType = (typeof OrderType)[keyof typeof OrderType];

export const OrderStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  SERVED: 'SERVED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

// Ordered list used for KDS / progression and validation of transitions.
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.SERVED,
  OrderStatus.COMPLETED,
];

export const TableStatus = {
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  RESERVED: 'RESERVED',
} as const;
export type TableStatus = (typeof TableStatus)[keyof typeof TableStatus];

export const PaymentProvider = {
  STRIPE: 'STRIPE',
  CASH: 'CASH',
} as const;
export type PaymentProvider = (typeof PaymentProvider)[keyof typeof PaymentProvider];

export const PaymentMethod = {
  CASH: 'CASH',
  CARD: 'CARD',
  PAYNOW: 'PAYNOW',
  GRABPAY: 'GRABPAY',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const CouponType = {
  PERCENT: 'PERCENT',
  FIXED: 'FIXED',
} as const;
export type CouponType = (typeof CouponType)[keyof typeof CouponType];

export const LoyaltyTxnType = {
  EARN: 'EARN',
  REDEEM: 'REDEEM',
} as const;
export type LoyaltyTxnType = (typeof LoyaltyTxnType)[keyof typeof LoyaltyTxnType];

// Socket.IO event names (single source of truth for client + server).
export const SocketEvent = {
  ORDER_NEW: 'order:new',
  ORDER_STATUS: 'order:status',
  ORDER_UPDATED: 'order:updated',
  KDS_QUEUE: 'kds:queue',
  JOIN_ORDER: 'join:order',
  JOIN_OUTLET: 'join:outlet',
  JOIN_KITCHEN: 'join:kitchen',
} as const;
export type SocketEvent = (typeof SocketEvent)[keyof typeof SocketEvent];
