'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { MenuItem, MenuResponse } from '@foodorder/shared';
import { api } from '../../lib/api';
import { useCart, lineUnitPrice, type CartLine } from '../../store/cart';
import { useSession } from '../../store/session';
import { Button, EmptyState } from '../../components/ui';
import { money } from '../../lib/format';
import ItemModal from '../../components/ItemModal';

export default function Cart() {
  const router = useRouter();
  const { lines, setQuantity, remove, subtotal } = useCart();
  const restaurantId = useSession((s) => s.restaurantId);
  const [editingLine, setEditingLine] = useState<CartLine | null>(null);

  const { data } = useQuery<MenuResponse>({
    queryKey: ['menu', restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => (await api.get(`/public/outlet/${restaurantId}/menu`)).data,
  });

  function findMenuItem(menuItemId: string): MenuItem | undefined {
    return data?.items.find((i) => i.id === menuItemId);
  }

  if (lines.length === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header onBack={() => router.back()} />
        <EmptyState title="Your cart is empty" subtitle="Add some dishes to get started." />
        <div className="p-4">
          <Button variant="outline" className="w-full" onClick={() => router.push('/menu')}>
            Back to menu
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header onBack={() => router.push('/menu')} />
      <main className="flex-1 px-4 py-3">
        <div className="space-y-3">
          {lines.map((l) => (
            <div key={l.key} className="rounded-2xl border border-gray-100 p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{l.name}</p>
                  {l.modifiers.length > 0 && (
                    <p className="mt-0.5 text-xs text-gray-500">
                      {l.modifiers.map((m) => m.name).join(', ')}
                    </p>
                  )}
                  {l.notes && <p className="mt-0.5 text-xs italic text-gray-400">&quot;{l.notes}&quot;</p>}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    onClick={() => setEditingLine(l)}
                    disabled={!findMenuItem(l.menuItemId)}
                    className="text-xs text-brand-700 disabled:text-gray-300"
                  >
                    Edit
                  </button>
                  <button onClick={() => remove(l.key)} className="text-xs text-red-400">
                    Remove
                  </button>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center rounded-lg border border-gray-200">
                  <button className="px-3 py-1.5" onClick={() => setQuantity(l.key, l.quantity - 1)}>
                    −
                  </button>
                  <span className="w-7 text-center text-sm font-semibold">{l.quantity}</span>
                  <button className="px-3 py-1.5" onClick={() => setQuantity(l.key, l.quantity + 1)}>
                    +
                  </button>
                </div>
                <span className="text-sm font-bold">{money(lineUnitPrice(l) * l.quantity)}</span>
              </div>
            </div>
          ))}
        </div>
      </main>

      <div className="sticky bottom-0 border-t border-gray-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="text-gray-500">Subtotal</span>
          <span className="font-semibold">{money(subtotal())}</span>
        </div>
        <Button className="w-full" disabled={!restaurantId} onClick={() => router.push('/checkout')}>
          Go to checkout
        </Button>
      </div>

      {editingLine &&
        (() => {
          const menuItem = findMenuItem(editingLine.menuItemId);
          if (!menuItem) return null;
          return <ItemModal item={menuItem} editingLine={editingLine} onClose={() => setEditingLine(null)} />;
        })()}
    </div>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 bg-white px-4 py-4">
      <button onClick={onBack} className="text-sm text-gray-400">
        ←
      </button>
      <h1 className="text-lg font-bold">Your order</h1>
    </header>
  );
}
