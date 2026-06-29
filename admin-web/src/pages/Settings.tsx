import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PaymentMethod, type Restaurant } from '@foodorder/shared';
import { api, apiError } from '../lib/api';
import { useTenant } from '../store/tenant';
import { Button, Card, Field, Input, PageHeader, Spinner } from '../components/ui';

const ALL_METHODS: PaymentMethod[] = [
  PaymentMethod.CASH,
  PaymentMethod.CARD,
  PaymentMethod.PAYNOW,
  PaymentMethod.GRABPAY,
];

export default function Settings() {
  const { restaurantId } = useTenant();
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery<Restaurant>({
    queryKey: ['restaurant', restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => (await api.get(`/restaurants/${restaurantId}`)).data,
  });

  const [form, setForm] = useState<Partial<Restaurant>>({});
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (isLoading || !data) return <Spinner />;

  function set<K extends keyof Restaurant>(k: K, v: Restaurant[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function toggleMethod(m: PaymentMethod) {
    const current = (form.paymentMethods ?? []) as PaymentMethod[];
    set(
      'paymentMethods',
      current.includes(m) ? current.filter((x) => x !== m) : [...current, m],
    );
  }

  async function save() {
    setError(null);
    setSaved(false);
    try {
      await api.put(`/restaurants/${restaurantId}`, {
        name: form.name,
        address: form.address,
        phone: form.phone,
        taxRate: Number(form.taxRate),
        serviceCharge: Number(form.serviceCharge),
        currency: form.currency,
        logo: form.logo || null,
        paymentMethods: form.paymentMethods,
      });
      setSaved(true);
      qc.invalidateQueries({ queryKey: ['restaurants'] });
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Outlet settings" subtitle={data.name} />
      <Card className="space-y-4 p-5">
        <Field label="Restaurant name">
          <Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Logo URL">
          <Input value={form.logo ?? ''} onChange={(e) => set('logo', e.target.value)} />
        </Field>
        <Field label="Address">
          <Input value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Tax rate %">
            <Input
              type="number"
              value={Number(form.taxRate ?? 0)}
              onChange={(e) => set('taxRate', Number(e.target.value) as Restaurant['taxRate'])}
            />
          </Field>
          <Field label="Service %">
            <Input
              type="number"
              value={Number(form.serviceCharge ?? 0)}
              onChange={(e) => set('serviceCharge', Number(e.target.value) as Restaurant['serviceCharge'])}
            />
          </Field>
          <Field label="Currency">
            <Input value={form.currency ?? 'SGD'} onChange={(e) => set('currency', e.target.value)} />
          </Field>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-gray-600">Payment methods</p>
          <div className="flex flex-wrap gap-2">
            {ALL_METHODS.map((m) => {
              const on = (form.paymentMethods ?? []).includes(m);
              return (
                <button
                  key={m}
                  onClick={() => toggleMethod(m)}
                  className={`rounded-full px-3 py-1.5 text-sm ${
                    on ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {saved && <p className="text-sm text-emerald-600">Saved ✓</p>}
        <Button onClick={save}>Save settings</Button>
      </Card>
    </div>
  );
}
