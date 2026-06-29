import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ProductReportRow, SalesReportRow } from '@foodorder/shared';
import { api, API_URL } from '../lib/api';
import { useAuth } from '../store/auth';
import { useTenant } from '../store/tenant';
import { Button, Card, PageHeader, Select, Spinner } from '../components/ui';
import { money } from '../lib/format';

const PERIODS = ['daily', 'weekly', 'monthly', 'yearly'] as const;
const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#db2777', '#7c3aed', '#0891b2', '#ca8a04'];

export default function Reports() {
  const { restaurantId, currency } = useTenant();
  const token = useAuth((s) => s.accessToken);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>('daily');

  const sales = useQuery<SalesReportRow[]>({
    queryKey: ['report-sales', restaurantId, period],
    enabled: !!restaurantId,
    queryFn: async () =>
      (await api.get('/reports/sales', { params: { restaurantId, period } })).data,
  });
  const products = useQuery<ProductReportRow[]>({
    queryKey: ['report-products', restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => (await api.get('/reports/products', { params: { restaurantId } })).data,
  });
  const categories = useQuery<{ label: string; revenue: number }[]>({
    queryKey: ['report-categories', restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => (await api.get('/reports/categories', { params: { restaurantId } })).data,
  });

  // Export downloads must carry the auth token; build a URL and fetch as blob.
  async function exportReport(report: 'sales' | 'products', format: 'csv' | 'xlsx' | 'pdf') {
    const params = new URLSearchParams({ report, format, period, ...(restaurantId ? { restaurantId } : {}) });
    const res = await fetch(`${API_URL}/api/v1/reports/export?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report}-report.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const topProducts = (products.data ?? []).slice(0, 10);
  const bottomProducts = [...(products.data ?? [])].reverse().slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => exportReport('sales', 'csv')}>CSV</Button>
            <Button variant="outline" onClick={() => exportReport('sales', 'xlsx')}>Excel</Button>
            <Button variant="outline" onClick={() => exportReport('sales', 'pdf')}>PDF</Button>
          </div>
        }
      />

      {/* Sales over time */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Sales ({period})</h2>
          <div className="w-36">
            <Select value={period} onChange={(e) => setPeriod(e.target.value as typeof period)}>
              {PERIODS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {sales.isLoading ? (
          <Spinner />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sales.data ?? []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip formatter={(v: number) => money(v, currency)} />
              <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue by category */}
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Revenue by category</h2>
          {categories.isLoading ? (
            <Spinner />
          ) : (categories.data ?? []).length === 0 ? (
            <p className="py-10 text-center text-gray-400">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categories.data}
                  dataKey="revenue"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {(categories.data ?? []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => money(v, currency)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Top / least sellers */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Top selling items</h2>
            <Button variant="ghost" onClick={() => exportReport('products', 'xlsx')}>
              Export
            </Button>
          </div>
          {products.isLoading ? (
            <Spinner />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-gray-400">
                <tr>
                  <th className="pb-2">Item</th>
                  <th className="pb-2 text-right">Qty</th>
                  <th className="pb-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p) => (
                  <tr key={p.menuItemId} className="border-t border-gray-100">
                    <td className="py-1.5">{p.name}</td>
                    <td className="py-1.5 text-right">{p.quantitySold}</td>
                    <td className="py-1.5 text-right">{money(p.revenue, currency)}</td>
                  </tr>
                ))}
                {topProducts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-gray-400">
                      No sales yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          {bottomProducts.length > 0 && (
            <p className="mt-3 text-xs text-gray-400">
              Least selling: {bottomProducts.map((p) => p.name).join(', ')}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
