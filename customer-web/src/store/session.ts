import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OrderType } from '@foodorder/shared';

interface SessionState {
  mode: OrderType;
  restaurantId: string | null;
  restaurantName: string | null;
  tableId: string | null;
  tableNumber: string | null;
  sessionId: string | null;
  customerName: string;
  customerPhone: string;
  setDineIn: (data: {
    restaurantId: string;
    restaurantName: string;
    tableId: string;
    tableNumber: string;
    sessionId: string;
  }) => void;
  setTakeaway: (restaurantId: string, restaurantName: string) => void;
  setCustomer: (name: string, phone: string) => void;
  reset: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      mode: OrderType.DINE_IN,
      restaurantId: null,
      restaurantName: null,
      tableId: null,
      tableNumber: null,
      sessionId: null,
      customerName: '',
      customerPhone: '',
      setDineIn: (data) =>
        set({
          mode: OrderType.DINE_IN,
          restaurantId: data.restaurantId,
          restaurantName: data.restaurantName,
          tableId: data.tableId,
          tableNumber: data.tableNumber,
          sessionId: data.sessionId,
        }),
      setTakeaway: (restaurantId, restaurantName) =>
        set({
          mode: OrderType.TAKEAWAY,
          restaurantId,
          restaurantName,
          tableId: null,
          tableNumber: null,
          sessionId: null,
        }),
      setCustomer: (name, phone) => set({ customerName: name, customerPhone: phone }),
      reset: () =>
        set({
          restaurantId: null,
          restaurantName: null,
          tableId: null,
          tableNumber: null,
          sessionId: null,
        }),
    }),
    { name: 'foodorder-session' },
  ),
);
