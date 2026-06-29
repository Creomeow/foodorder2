import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TenantState {
  restaurantId: string | null;
  restaurantName: string | null;
  currency: string;
  setRestaurant: (id: string, name: string, currency?: string) => void;
}

// The currently-selected outlet that scopes the admin views.
export const useTenant = create<TenantState>()(
  persist(
    (set) => ({
      restaurantId: null,
      restaurantName: null,
      currency: 'SGD',
      setRestaurant: (id, name, currency = 'SGD') =>
        set({ restaurantId: id, restaurantName: name, currency }),
    }),
    { name: 'foodorder-admin-tenant' },
  ),
);
