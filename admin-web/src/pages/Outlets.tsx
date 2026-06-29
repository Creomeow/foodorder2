import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Role } from '@foodorder/shared';
import { api, apiError } from '../lib/api';
import { useAuth } from '../store/auth';
import { useBrands, useRestaurants } from '../lib/hooks';
import { Button, Card, Field, Input, Modal, PageHeader, Select, Spinner } from '../components/ui';

export default function Outlets() {
  const qc = useQueryClient();
  const role = useAuth((s) => s.user?.role);
  const { data, isLoading } = useRestaurants();
  const [open, setOpen] = useState(false);

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/restaurants/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurants'] }),
  });

  return (
    <div>
      <PageHeader
        title="Outlets"
        subtitle="Restaurants / branches"
        action={<Button onClick={() => setOpen(true)}>+ New outlet</Button>}
      />
      {isLoading || !data ? (
        <Spinner />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {data.map((r) => (
            <Card key={r.id} className="p-4">
              <p className="font-semibold">{r.name}</p>
              <p className="text-xs text-gray-400">{r.address ?? '—'}</p>
              <p className="mt-1 text-xs text-gray-500">
                Tax {Number(r.taxRate)}% · Service {Number(r.serviceCharge)}% · {r.currency}
              </p>
              {role === Role.SUPER_ADMIN && (
                <Button variant="danger" className="mt-3" onClick={() => del.mutate(r.id)}>
                  Delete
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
      {open && (
        <OutletModal
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ['restaurants'] });
          }}
        />
      )}
    </div>
  );
}

function OutletModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const user = useAuth((s) => s.user);
  const { data: brands } = useBrands(user?.role === Role.SUPER_ADMIN);
  const [form, setForm] = useState({
    name: '',
    brandId: user?.brandId ?? '',
    address: '',
    phone: '',
    taxRate: 9,
    serviceCharge: 10,
    currency: 'SGD',
  });
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setError(null);
    try {
      await api.post('/restaurants', {
        ...form,
        taxRate: Number(form.taxRate),
        serviceCharge: Number(form.serviceCharge),
        address: form.address || null,
        phone: form.phone || null,
        paymentMethods: ['CASH', 'CARD', 'PAYNOW', 'GRABPAY'],
      });
      onSaved();
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <Modal title="New outlet" onClose={onClose}>
      <div className="space-y-3">
        {user?.role === Role.SUPER_ADMIN && (
          <Field label="Brand">
            <Select value={form.brandId} onChange={(e) => set('brandId', e.target.value)}>
              <option value="">Select brand…</option>
              {brands?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Name">
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Address">
          <Input value={form.address} onChange={(e) => set('address', e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Tax %">
            <Input type="number" value={form.taxRate} onChange={(e) => set('taxRate', Number(e.target.value))} />
          </Field>
          <Field label="Service %">
            <Input
              type="number"
              value={form.serviceCharge}
              onChange={(e) => set('serviceCharge', Number(e.target.value))}
            />
          </Field>
          <Field label="Currency">
            <Input value={form.currency} onChange={(e) => set('currency', e.target.value)} />
          </Field>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button className="w-full" onClick={save}>
          Create outlet
        </Button>
      </div>
    </Modal>
  );
}
