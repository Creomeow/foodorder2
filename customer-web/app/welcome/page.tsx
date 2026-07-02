'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { MenuResponse, Promotion } from '@foodorder/shared';
import { api } from '../../lib/api';
import { useSession } from '../../store/session';
import { Button, Spinner } from '../../components/ui';
import OutletInfoDrawer from '../../components/OutletInfoDrawer';

export default function Welcome() {
  const router = useRouter();
  const { restaurantId, restaurantName, mode, tableNumber } = useSession();
  const [showInfo, setShowInfo] = useState(false);

  const { data: menuData, isLoading } = useQuery<MenuResponse>({
    queryKey: ['menu', restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => (await api.get(`/public/outlet/${restaurantId}/menu`)).data,
  });

  const { data: promotions } = useQuery<Promotion[]>({
    queryKey: ['promotions', restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => (await api.get(`/public/outlet/${restaurantId}/promotions`)).data,
  });

  useEffect(() => {
    if (!restaurantId) router.replace('/');
  }, [restaurantId, router]);

  if (!restaurantId) return null;
  if (isLoading || !menuData) return <Spinner label="Loading outlet…" />;

  return (
    <div className="flex min-h-screen flex-col px-5 py-8">
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-900">Welcome to {restaurantName}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {mode === 'DINE_IN' ? `Table Number: ${tableNumber}` : 'Takeaway order'}
        </p>
      </div>

      {promotions && promotions.length > 0 && (
        <div className="no-scrollbar mt-6 flex gap-3 overflow-x-auto">
          {promotions.map((p) => (
            <div
              key={p.id}
              className="min-w-[85%] shrink-0 overflow-hidden rounded-2xl border border-gray-100 shadow-sm"
            >
              {p.bannerImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.bannerImageUrl} alt={p.name} className="h-32 w-full object-cover" />
              )}
              <div className="p-3">
                <p className="text-sm font-semibold">{p.name}</p>
                {p.ctaText && <p className="mt-0.5 text-xs text-gray-500">{p.ctaText}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowInfo(true)}
        className="mt-6 flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm shadow-sm"
      >
        <span className="font-medium text-gray-700">Outlet Info</span>
        <span className="text-gray-400">›</span>
      </button>

      <div className="mt-auto pt-8">
        <Button className="w-full" onClick={() => router.push('/menu')}>
          Confirm
        </Button>
      </div>

      {showInfo && <OutletInfoDrawer restaurant={menuData.restaurant} onClose={() => setShowInfo(false)} />}
    </div>
  );
}
