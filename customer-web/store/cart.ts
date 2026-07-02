import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MenuItem, ModifierOption } from '@foodorder/shared';
import { clientStorage } from '../lib/persist-storage';

export interface CartModifier {
  optionId: string;
  groupId: string;
  name: string;
  price: number;
}

export interface CartLine {
  key: string;
  menuItemId: string;
  name: string;
  basePrice: number;
  imageUrl: string | null;
  quantity: number;
  notes: string;
  modifiers: CartModifier[];
}

function lineKey(menuItemId: string, mods: CartModifier[], notes: string): string {
  const ids = mods.map((m) => m.optionId).sort().join(',');
  return `${menuItemId}|${ids}|${notes.trim()}`;
}

export function lineUnitPrice(line: Pick<CartLine, 'basePrice' | 'modifiers'>): number {
  return line.basePrice + line.modifiers.reduce((s, m) => s + m.price, 0);
}

interface CartState {
  lines: CartLine[];
  addItem: (item: MenuItem, modifiers: ModifierOption[], notes: string, quantity: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  /** Replace an existing line (by key) with a re-built line — used when editing a cart entry in place. */
  updateLine: (
    oldKey: string,
    item: MenuItem,
    modifiers: ModifierOption[],
    notes: string,
    quantity: number,
  ) => void;
  clear: () => void;
  count: () => number;
  quantityForItem: (menuItemId: string) => number;
  subtotal: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      addItem: (item, modifiers, notes, quantity) => {
        const mods: CartModifier[] = modifiers.map((m) => ({
          optionId: m.id,
          groupId: m.modifierGroupId,
          name: m.name,
          price: Number(m.price),
        }));
        const key = lineKey(item.id, mods, notes);
        set((state) => {
          const existing = state.lines.find((l) => l.key === key);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.key === key ? { ...l, quantity: l.quantity + quantity } : l,
              ),
            };
          }
          return {
            lines: [
              ...state.lines,
              {
                key,
                menuItemId: item.id,
                name: item.name,
                basePrice: Number(item.price),
                imageUrl: item.imageUrl,
                quantity,
                notes,
                modifiers: mods,
              },
            ],
          };
        });
      },
      setQuantity: (key, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.key !== key)
              : state.lines.map((l) => (l.key === key ? { ...l, quantity } : l)),
        })),
      remove: (key) => set((state) => ({ lines: state.lines.filter((l) => l.key !== key) })),
      updateLine: (oldKey, item, modifiers, notes, quantity) => {
        set((state) => ({ lines: state.lines.filter((l) => l.key !== oldKey) }));
        get().addItem(item, modifiers, notes, quantity);
      },
      clear: () => set({ lines: [] }),
      count: () => get().lines.reduce((s, l) => s + l.quantity, 0),
      quantityForItem: (menuItemId) =>
        get().lines.filter((l) => l.menuItemId === menuItemId).reduce((s, l) => s + l.quantity, 0),
      subtotal: () => get().lines.reduce((s, l) => s + lineUnitPrice(l) * l.quantity, 0),
    }),
    { name: 'foodorder-cart', storage: clientStorage },
  ),
);
