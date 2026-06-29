import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CouponType, type Coupon } from '@foodorder/shared';
import { api, apiError } from '../lib/api';
import { useAuth } from '../store/auth';
import { useTenant } from '../store/tenant';
import { Button, Card, Field, Input, Modal, PageHeader, Select, Spinner } from '../components/ui';

export default function Coupons() {
  const qc = useQueryClient();
  const { restaurantId } = useTenant();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery<Coupon[]>({
    queryKey: ['coupons'],
    queryFn: async () => (await api.get('/coupons')).data,
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/coupons/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coupons'] }),
  });

  return (
    <div>
      <PageHeader title="Coupons" action={<Button onClick={() => setOpen(true)}>+ New coupon</Button>} />
      {isLoading || !data ? (
        <Spinner />
      ) : (
        <div className="space-y-2">
          {data.map((c) => (
            <Card key={c.id} className="flex items-center justify-between p-3">
              <div>
                <span className="font-mono font-bold">{c.code}</span>
                <span className="ml-2 text-sm text-gray-500">
                  {c.type === CouponType.PERCENT ? `${Number(c.value)}% off` : `$${Number(c.value)} off`}
                  {Number(c.minSpend) > 0 ? ` · min $${Number(c.minSpend)}` : ''}
                </span>
                {!c.active && <span className="ml-2 text-xs text-red-400">inactive</span>}
              </div>
              <Button variant="danger" onClick={() => del.mutate(c.id)}>
                Delete
              </Button>
            </Card>
          ))}
          {data.length === 0 && <p className="py-12 text-center text-gray-400">No coupons yet.</p>}
        </div>
      )}
      {open && (
        <CouponModal
          restaurantId={restaurantId!}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ['coupons'] });
          }}
        />
      )}
    </div>
  );
}

function CouponModal({
  restaurantId,
  onClose,
  onSaved,
}: {
  restaurantId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const brandId = useAuth((s) => s.user?.brandId);
  const [code, setCode] = useState('');
  const [type, setType] = useState<CouponType>(CouponType.PERCENT);
  const [value, setValue] = useState(10);
  const [minSpend, setMinSpend] = useState(0);
  const [scope, setScope] = useState<'outlet' | 'brand'>('outlet');
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    try {
      await api.post('/coupons', {
        code: code.toUpperCase(),
        type,
        value: Number(value),
        minSpend: Number(minSpend),
        restaurantId: scope === 'outlet' ? restaurantId : null,
        brandId: scope === 'brand' ? brandId ?? null : null,
        active: true,
      });
      onSaved();
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <Modal title="New coupon" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Code">
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="WELCOME10" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value as CouponType)}>
              <option value={CouponType.PERCENT}>Percent (%)</option>
              <option value={CouponType.FIXED}>Fixed ($)</option>
            </Select>
          </Field>
          <Field label="Value">
            <Input type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Min spend">
            <Input type="number" value={minSpend} onChange={(e) => setMinSpend(Number(e.target.value))} />
          </Field>
          <Field label="Scope">
            <Select value={scope} onChange={(e) => setScope(e.target.value as 'outlet' | 'brand')}>
              <option value="outlet">This outlet</option>
              <option value="brand">Whole brand</option>
            </Select>
          </Field>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button className="w-full" onClick={save}>
          Create coupon
        </Button>
      </div>
    </Modal>
  );
}
