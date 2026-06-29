import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { OrderStatus, type Order, type Paginated } from '@foodorder/shared';
import { api } from '../lib/api';
import { useTenant } from '../store/tenant';
import { subscribeOutlet } from '../lib/socket';
import { Card, PageHeader, Spinner, StatusBadge, Button, Input } from '../components/ui';
import { money, timeAgo } from '../lib/format';

const FILTERS: { label: string; value: OrderStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: OrderStatus.PENDING },
  { label: 'Preparing', value: OrderStatus.PREPARING },
  { label: 'Ready', value: OrderStatus.READY },
  { label: 'Completed', value: OrderStatus.COMPLETED },
  { label: 'Cancelled', value: OrderStatus.CANCELLED },
];

// Allowed next actions per status.
const NEXT: Partial<Record<OrderStatus, { label: string; status: OrderStatus }[]>> = {
  PENDING: [
    { label: 'Confirm', status: OrderStatus.CONFIRMED },
    { label: 'Cancel', status: OrderStatus.CANCELLED },
  ],
  CONFIRMED: [{ label: 'Start preparing', status: OrderStatus.PREPARING }],
  PREPARING: [{ label: 'Mark ready', status: OrderStatus.READY }],
  READY: [{ label: 'Mark served', status: OrderStatus.SERVED }],
  SERVED: [{ label: 'Complete', status: OrderStatus.COMPLETED }],
};

export default function Orders() {
  const { restaurantId, currency } = useTenant();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<Paginated<Order>>({
    queryKey: ['orders', restaurantId, filter, search, page],
    enabled: !!restaurantId,
    queryFn: async () =>
      (
        await api.get('/orders', {
          params: {
            restaurantId,
            status: filter === 'ALL' ? undefined : filter,
            search: search || undefined,
            page,
          },
        })
      ).data,
  });

  useEffect(() => {
    if (!restaurantId) return;
    const refetch = () => qc.invalidateQueries({ queryKey: ['orders', restaurantId] });
    return subscribeOutlet(restaurantId, { onNew: refetch, onUpdated: refetch });
  }, [restaurantId, qc]);

  async function updateStatus(id: string, status: OrderStatus) {
    await api.patch(`/orders/${id}/status`, { status });
    qc.invalidateQueries({ queryKey: ['orders', restaurantId] });
  }

  return (
    <div>
      <PageHeader title="Orders" subtitle="Live order queue" />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setFilter(f.value);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              filter === f.value ? 'bg-brand text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="ml-auto w-48">
          <Input
            placeholder="Search order # / name"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {isLoading || !data ? (
        <Spinner label="Loading orders…" />
      ) : data.data.length === 0 ? (
        <p className="py-16 text-center text-gray-400">No orders found.</p>
      ) : (
        <div className="space-y-3">
          {data.data.map((o) => (
            <Card key={o.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">#{o.orderNumber}</span>
                    <StatusBadge status={o.status} />
                    <span className="text-xs text-gray-400">
                      {o.orderType === 'DINE_IN' ? `Table ${o.tableNumber ?? ''}` : 'Takeaway'} ·{' '}
                      {timeAgo(o.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    {o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                  </p>
                  {o.customerName && (
                    <p className="mt-0.5 text-xs text-gray-400">
                      {o.customerName} {o.customerPhone ? `· ${o.customerPhone}` : ''}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold">{money(Number(o.total), currency)}</p>
                  <div className="mt-2 flex flex-wrap justify-end gap-2">
                    {(NEXT[o.status] ?? []).map((action) => (
                      <Button
                        key={action.status}
                        variant={action.status === OrderStatus.CANCELLED ? 'danger' : 'primary'}
                        onClick={() => updateStatus(o.id, action.status)}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </Button>
          <span className="text-sm text-gray-500">
            Page {data.page} / {data.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
