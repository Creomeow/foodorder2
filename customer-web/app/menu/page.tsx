'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { MenuItem, MenuResponse } from '@foodorder/shared';
import { api } from '../../lib/api';
import { useSession } from '../../store/session';
import { useCart } from '../../store/cart';
import { Spinner, Badge, EmptyState } from '../../components/ui';
import { money } from '../../lib/format';
import CartBar from '../../components/CartBar';
import ItemModal from '../../components/ItemModal';
import ServiceModeModal from '../../components/ServiceModeModal';

export default function Menu() {
  const router = useRouter();
  const { restaurantId, restaurantName, mode, tableNumber } = useSession();
  const quantityForItem = useCart((s) => s.quantityForItem);
  const cartLines = useCart((s) => s.lines); // subscribe so badges re-render on cart change
  const [search, setSearch] = useState('');
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [showServiceMode, setShowServiceMode] = useState(false);
  const [showLoginToast, setShowLoginToast] = useState(false);
  const [loginBannerDismissed, setLoginBannerDismissed] = useState(false);

  const { data, isLoading, isError } = useQuery<MenuResponse>({
    queryKey: ['menu', restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => (await api.get(`/public/outlet/${restaurantId}/menu`)).data,
  });

  const grouped = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.categories
      .map((cat) => ({
        category: cat,
        items: data.items.filter(
          (it) =>
            it.categoryId === cat.id &&
            (!q ||
              it.name.toLowerCase().includes(q) ||
              cat.name.toLowerCase().includes(q) ||
              (it.description ?? '').toLowerCase().includes(q)),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [data, search]);

  if (!restaurantId) {
    return <EmptyState title="No active session" subtitle="Scan your table QR code to start." />;
  }
  if (isLoading) return <Spinner label="Loading menu…" />;
  if (isError || !data) return <EmptyState title="Could not load menu" />;

  void cartLines; // re-render trigger only

  function scrollTo(catId: string) {
    setActiveCat(catId);
    document.getElementById(`cat-${catId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 px-4 pb-2 pt-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold leading-tight">{restaurantName ?? 'Menu'}</h1>
            <button
              onClick={() => setShowServiceMode(true)}
              className="mt-0.5 flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
            >
              {mode === 'DINE_IN' ? `Dine in · Table ${tableNumber}` : 'Takeaway'}
              <span className="text-gray-400">▾</span>
            </button>
          </div>
          <button
            onClick={() => router.push('/cart')}
            className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700"
          >
            Cart
          </button>
        </div>

        {!loginBannerDismissed && (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2 text-xs">
            <button
              className="flex-1 text-left font-medium text-brand-700"
              onClick={() => setShowLoginToast(true)}
            >
              Log in to quickly re-add items from recent orders & access favourites
            </button>
            <button
              className="ml-2 text-gray-400"
              onClick={() => setLoginBannerDismissed(true)}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}
        {showLoginToast && (
          <div className="mt-2 rounded-lg bg-gray-800 px-3 py-1.5 text-center text-xs text-white">
            Coming soon
          </div>
        )}

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search dishes…"
          className="mt-3 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-brand focus:outline-none"
        />

        {/* Sticky category tabs */}
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
          {grouped.map((g) => (
            <button
              key={g.category.id}
              onClick={() => scrollTo(g.category.id)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                activeCat === g.category.id ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {g.category.name} ({g.items.length})
            </button>
          ))}
        </div>
      </header>

      {/* Sections */}
      <main className="flex-1 px-4 py-2">
        {grouped.length === 0 && <EmptyState title="No items found" subtitle="Try another search." />}
        {grouped.map((g) => (
          <section key={g.category.id} id={`cat-${g.category.id}`} className="scroll-mt-40 py-3">
            <h2 className="mb-2 text-base font-bold">{g.category.name}</h2>
            <div className="space-y-3">
              {g.items.map((it) => {
                const inCart = quantityForItem(it.id);
                return (
                  <button
                    key={it.id}
                    onClick={() => setActiveItem(it)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 p-2 text-left shadow-sm active:scale-[0.99]"
                  >
                    {it.imageUrl && (
                      <div className="relative h-20 w-20 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={it.imageUrl} alt={it.name} className="h-20 w-20 rounded-xl object-cover" />
                        {inCart > 0 && (
                          <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs font-bold text-white shadow">
                            {inCart}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate font-semibold">{it.name}</p>
                        {it.popular && <Badge>Popular</Badge>}
                        {it.recommended && <Badge color="green">Chef&apos;s pick</Badge>}
                      </div>
                      {it.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{it.description}</p>
                      )}
                      <p className="mt-1 text-sm font-bold text-brand">{money(Number(it.price))}</p>
                    </div>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-lg text-white">
                      +
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      <CartBar />
      {activeItem && <ItemModal item={activeItem} onClose={() => setActiveItem(null)} />}
      {showServiceMode && <ServiceModeModal onClose={() => setShowServiceMode(false)} />}
    </div>
  );
}
