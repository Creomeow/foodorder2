import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OrderType } from '@foodorder/shared';
import { clientStorage } from '../lib/persist-storage';

interface SessionState {
  mode: OrderType;
  restaurantId: string | null;
  restaurantName: string | null;
  tableId: string | null;
  tableNumber: string | null;
  sessionId: string | null;
  customerName: string;
  customerPhone: string;
  serviceTime: 'ASAP' | 'LATER';
  scheduledFor: string | null;
  setDineIn: (data: {
    restaurantId: string;
    restaurantName: string;
    tableId: string;
    tableNumber: string;
    sessionId: string;
  }) => void;
  setTakeaway: (restaurantId: string, restaurantName: string) => void;
  setCustomer: (name: string, phone: string) => void;
  setServiceTime: (time: 'ASAP' | 'LATER', scheduledFor: string | null) => void;
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
      serviceTime: 'ASAP',
      scheduledFor: null,
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
      setServiceTime: (serviceTime, scheduledFor) => set({ serviceTime, scheduledFor }),
      reset: () =>
        set({
          restaurantId: null,
          restaurantName: null,
          tableId: null,
          tableNumber: null,
          sessionId: null,
          serviceTime: 'ASAP',
          scheduledFor: null,
        }),
    }),
    { name: 'foodorder-session', storage: clientStorage },
  ),
);
