'use client';

import { useRouter } from 'next/navigation';
import { useCart } from '../store/cart';
import { money } from '../lib/format';

export default function CartBar({ to = '/cart', label = 'View cart' }: { to?: string; label?: string }) {
  const router = useRouter();
  const count = useCart((s) => s.count());
  const subtotal = useCart((s) => s.subtotal());

  if (count === 0) return null;

  return (
    <div className="sticky bottom-0 z-20 border-t border-gray-100 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <button
        onClick={() => router.push(to)}
        className="flex w-full items-center justify-between rounded-xl bg-brand px-4 py-3.5 text-white shadow-lg shadow-brand-100 active:scale-[0.99]"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/25 text-xs">
            {count}
          </span>
          {label}
        </span>
        <span className="text-sm font-bold">{money(subtotal)}</span>
      </button>
    </div>
  );
}
