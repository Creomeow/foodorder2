import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { OrderStatus, type Order, type Paginated } from '@foodorder/shared';
import { api } from '../lib/api';
import { useTenant } from '../store/tenant';
import { subscribeOutlet } from '../lib/socket';
import { timeAgo } from '../lib/format';

// Kitchen Display System — full-screen, large touch targets, auto-updating.
const ACTIVE: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
];

const ACTION: Partial<Record<OrderStatus, { label: string; next: OrderStatus; cls: string }>> = {
  PENDING: { label: 'Accept', next: OrderStatus.CONFIRMED, cls: 'bg-blue-600' },
  CONFIRMED: { label: 'Start cooking', next: OrderStatus.PREPARING, cls: 'bg-indigo-600' },
  PREPARING: { label: 'Mark ready', next: OrderStatus.READY, cls: 'bg-emerald-600' },
  READY: { label: 'Complete', next: OrderStatus.COMPLETED, cls: 'bg-gray-700' },
};

const COLUMN_TINT: Record<string, string> = {
  PENDING: 'border-amber-400',
  CONFIRMED: 'border-blue-400',
  PREPARING: 'border-indigo-400',
  READY: 'border-emerald-400',
};

export default function KDS() {
  const navigate = useNavigate();
  const { restaurantId, restaurantName } = useTenant();
  const qc = useQueryClient();

  const { data } = useQuery<Paginated<Order>>({
    queryKey: ['kds', restaurantId],
    enabled: !!restaurantId,
    queryFn: async () =>
      (await api.get('/orders', { params: { restaurantId, pageSize: 100 } })).data,
    refetchInterval: 20000,
  });

  useEffect(() => {
    if (!restaurantId) return;
    const refetch = () => qc.invalidateQueries({ queryKey: ['kds', restaurantId] });
    return subscribeOutlet(restaurantId, { onNew: refetch, onUpdated: refetch, onKds: refetch });
  }, [restaurantId, qc]);

  async function advance(id: string, next: OrderStatus) {
    await api.patch(`/orders/${id}/status`, { status: next });
    qc.invalidateQueries({ queryKey: ['kds', restaurantId] });
  }

  const orders = (data?.data ?? []).filter((o) => ACTIVE.includes(o.status));

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Kitchen Display</h1>
          <p className="text-sm text-gray-400">{restaurantName}</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="rounded-lg border border-gray-700 px-4 py-2 text-sm hover:bg-gray-800"
        >
          Exit
        </button>
      </header>

      <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
        {orders.length === 0 && (
          <p className="col-span-full py-20 text-center text-2xl text-gray-600">No active orders 🎉</p>
        )}
        {orders.map((o) => {
          const action = ACTION[o.status];
          return (
            <div
              key={o.id}
              className={`flex flex-col rounded-2xl border-l-8 bg-gray-900 p-4 ${COLUMN_TINT[o.status] ?? 'border-gray-600'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl font-extrabold">#{o.orderNumber}</span>
                <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs">{o.status}</span>
              </div>
              <p className="mt-1 text-sm text-gray-400">
                {o.orderType === 'DINE_IN' ? `Table ${o.tableNumber ?? ''}` : 'Takeaway'} ·{' '}
                {timeAgo(o.createdAt)}
              </p>
              <ul className="mt-3 flex-1 space-y-2">
                {o.items.map((it) => (
                  <li key={it.id} className="border-b border-gray-800 pb-2">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>{it.name}</span>
                      <span className="text-brand">×{it.quantity}</span>
                    </div>
                    {it.modifiers.length > 0 && (
                      <p className="text-sm text-amber-300">
                        {it.modifiers.map((m) => m.name).join(', ')}
                      </p>
                    )}
                    {it.notes && <p className="text-sm italic text-gray-400">"{it.notes}"</p>}
                  </li>
                ))}
              </ul>
              {action && (
                <button
                  onClick={() => advance(o.id, action.next)}
                  className={`mt-3 rounded-xl py-3 text-lg font-bold active:scale-[0.98] ${action.cls}`}
                >
                  {action.label}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
