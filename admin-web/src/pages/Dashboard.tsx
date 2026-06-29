import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { DashboardStats } from '@foodorder/shared';
import { api } from '../lib/api';
import { useTenant } from '../store/tenant';
import { subscribeOutlet } from '../lib/socket';
import { Card, PageHeader, Spinner } from '../components/ui';
import { money } from '../lib/format';

export default function Dashboard() {
  const { restaurantId, restaurantName, currency } = useTenant();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard', restaurantId],
    enabled: !!restaurantId,
    queryFn: async () =>
      (await api.get('/reports/dashboard', { params: { restaurantId } })).data,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!restaurantId) return;
    const refetch = () => qc.invalidateQueries({ queryKey: ['dashboard', restaurantId] });
    return subscribeOutlet(restaurantId, { onNew: refetch, onUpdated: refetch });
  }, [restaurantId, qc]);

  if (isLoading || !data) return <Spinner label="Loading dashboard…" />;

  const cards = [
    { label: "Today's Revenue", value: money(data.todayRevenue, currency), accent: 'text-emerald-600' },
    { label: "Today's Orders", value: String(data.todayOrders), accent: 'text-blue-600' },
    { label: 'Avg Order Value', value: money(data.averageOrderValue, currency), accent: 'text-indigo-600' },
    { label: 'Active Orders', value: String(data.activeOrders), accent: 'text-amber-600' },
    { label: 'Completed Today', value: String(data.completedOrders), accent: 'text-gray-700' },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={restaurantName ?? undefined} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <p className="text-xs font-medium text-gray-500">{c.label}</p>
            <p className={`mt-2 text-2xl font-bold ${c.accent}`}>{c.value}</p>
          </Card>
        ))}
      </div>
      <p className="mt-6 text-sm text-gray-400">
        Live updates stream in as orders are placed and progress through the kitchen.
      </p>
    </div>
  );
}
