import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { MenuItem, MenuResponse } from '@foodorder/shared';
import { api } from '../lib/api';
import { useSession } from '../store/session';
import { Spinner, Badge, EmptyState } from '../components/ui';
import { money } from '../lib/format';
import CartBar from '../components/CartBar';
import ItemModal from '../components/ItemModal';

export default function Menu() {
  const navigate = useNavigate();
  const { restaurantId, restaurantName, mode, tableNumber } = useSession();
  const [search, setSearch] = useState('');
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [activeCat, setActiveCat] = useState<string | null>(null);

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
            <p className="text-xs text-gray-500">
              {mode === 'DINE_IN' ? `Dine in · Table ${tableNumber}` : 'Takeaway'}
            </p>
          </div>
          <button
            onClick={() => navigate('/cart')}
            className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700"
          >
            Cart
          </button>
        </div>

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
              {g.category.name}
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
              {g.items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => setActiveItem(it)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 p-2 text-left shadow-sm active:scale-[0.99]"
                >
                  {it.imageUrl && (
                    <img src={it.imageUrl} alt={it.name} className="h-20 w-20 rounded-xl object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-semibold">{it.name}</p>
                      {it.popular && <Badge>Popular</Badge>}
                      {it.recommended && <Badge color="green">Chef's pick</Badge>}
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
              ))}
            </div>
          </section>
        ))}
      </main>

      <CartBar />
      {activeItem && <ItemModal item={activeItem} onClose={() => setActiveItem(null)} />}
    </div>
  );
}
