import { Role } from '@foodorder/shared';
import type { JwtPayload } from './jwt.js';
import { prisma } from './prisma.js';
import { forbidden } from './errors.js';

/**
 * Build a Prisma `where` fragment that restricts a query to the rows the user
 * may see, based on their role/tenancy.
 *
 * - SUPER_ADMIN: no restriction (optionally narrowed by requestedRestaurantId)
 * - MANAGER: restricted to their brand's restaurants
 * - STAFF: restricted to their single restaurant
 */
export function restaurantScopeWhere(
  user: JwtPayload,
  requestedRestaurantId?: string,
): { restaurantId?: string; restaurant?: { brandId: string } } {
  if (user.role === Role.SUPER_ADMIN) {
    return requestedRestaurantId ? { restaurantId: requestedRestaurantId } : {};
  }
  if (user.role === Role.MANAGER) {
    if (requestedRestaurantId) return { restaurantId: requestedRestaurantId };
    if (user.brandId) return { restaurant: { brandId: user.brandId } };
    return { restaurantId: '__none__' };
  }
  // STAFF
  return { restaurantId: user.restaurantId ?? '__none__' };
}

/** Throw unless the user is allowed to act on the given restaurant. */
export async function assertCanAccessRestaurant(
  user: JwtPayload,
  restaurantId: string,
): Promise<void> {
  if (user.role === Role.SUPER_ADMIN) return;

  if (user.role === Role.STAFF) {
    if (user.restaurantId !== restaurantId) throw forbidden('Outside your outlet');
    return;
  }

  // MANAGER — must belong to the brand that owns the restaurant.
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { brandId: true },
  });
  if (!restaurant || restaurant.brandId !== user.brandId) {
    throw forbidden('Outside your brand');
  }
}

/** Brand-level scope (for brand/coupon/loyalty queries). */
export function brandScopeWhere(user: JwtPayload): { id?: string } {
  if (user.role === Role.SUPER_ADMIN) return {};
  return { id: user.brandId ?? '__none__' };
}
