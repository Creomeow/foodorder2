import { CouponType } from '@foodorder/shared';
import { prisma } from '../../lib/prisma.js';

export interface CouponResult {
  valid: boolean;
  discount: number;
  message?: string;
  couponId: string | null;
}

/**
 * Validate a coupon for a given outlet + subtotal and compute the discount.
 * A coupon applies if it is active, in-date, has redemptions left, the subtotal
 * meets minSpend, and it is scoped to this outlet or its brand (or global).
 */
export async function applyCoupon(
  code: string,
  restaurantId: string,
  subtotal: number,
): Promise<CouponResult> {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
  if (!coupon || !coupon.active) return { valid: false, discount: 0, couponId: null, message: 'Invalid coupon' };

  const now = new Date();
  if (coupon.validFrom && now < coupon.validFrom)
    return { valid: false, discount: 0, couponId: null, message: 'Coupon not active yet' };
  if (coupon.validTo && now > coupon.validTo)
    return { valid: false, discount: 0, couponId: null, message: 'Coupon expired' };
  if (coupon.maxRedemptions > 0 && coupon.redeemedCount >= coupon.maxRedemptions)
    return { valid: false, discount: 0, couponId: null, message: 'Coupon fully redeemed' };

  // Scope check.
  if (coupon.restaurantId && coupon.restaurantId !== restaurantId) {
    return { valid: false, discount: 0, couponId: null, message: 'Coupon not valid here' };
  }
  if (coupon.brandId && !coupon.restaurantId) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { brandId: true },
    });
    if (restaurant?.brandId !== coupon.brandId) {
      return { valid: false, discount: 0, couponId: null, message: 'Coupon not valid here' };
    }
  }

  if (subtotal < Number(coupon.minSpend)) {
    return {
      valid: false,
      discount: 0,
      couponId: null,
      message: `Minimum spend is ${Number(coupon.minSpend).toFixed(2)}`,
    };
  }

  const discount =
    coupon.type === CouponType.PERCENT
      ? (subtotal * Number(coupon.value)) / 100
      : Number(coupon.value);

  return {
    valid: true,
    discount: Math.min(discount, subtotal),
    couponId: coupon.id,
  };
}
