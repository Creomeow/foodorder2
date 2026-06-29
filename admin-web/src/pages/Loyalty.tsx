import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Card, PageHeader, Spinner } from '../components/ui';

interface LoyaltyAccount {
  id: string;
  points: number;
  tier: string;
  customer: { name: string | null; phone: string | null };
  _count: { transactions: number };
}

export default function Loyalty() {
  const { data, isLoading } = useQuery<LoyaltyAccount[]>({
    queryKey: ['loyalty'],
    queryFn: async () => (await api.get('/loyalty/accounts')).data,
  });

  return (
    <div>
      <PageHeader title="Loyalty" subtitle="Member points & tiers" />
      {isLoading || !data ? (
        <Spinner />
      ) : data.length === 0 ? (
        <p className="py-12 text-center text-gray-400">
          No loyalty members yet. Points accrue as customers place orders with contact details.
        </p>
      ) : (
        <div className="space-y-2">
          {data.map((a) => (
            <Card key={a.id} className="flex items-center justify-between p-3">
              <div>
                <p className="font-semibold">{a.customer.name ?? 'Guest'}</p>
                <p className="text-xs text-gray-400">{a.customer.phone ?? '—'}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-brand">{a.points} pts</p>
                <p className="text-xs text-gray-400">{a.tier}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
