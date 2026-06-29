import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '../lib/api';
import { useBrands } from '../lib/hooks';
import { Button, Card, Field, Input, Modal, PageHeader, Spinner } from '../components/ui';

export default function Brands() {
  const qc = useQueryClient();
  const { data, isLoading } = useBrands();
  const [open, setOpen] = useState(false);

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/brands/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brands'] }),
  });

  return (
    <div>
      <PageHeader
        title="Brands"
        subtitle="Top-level tenants — each owns multiple outlets"
        action={<Button onClick={() => setOpen(true)}>+ New brand</Button>}
      />
      {isLoading || !data ? (
        <Spinner />
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {data.map((b) => (
            <Card key={b.id} className="p-4">
              <p className="font-semibold">{b.name}</p>
              <p className="text-xs text-gray-400">{b._count?.restaurants ?? 0} outlets</p>
              <Button variant="danger" className="mt-3" onClick={() => del.mutate(b.id)}>
                Delete
              </Button>
            </Card>
          ))}
        </div>
      )}
      {open && (
        <BrandModal
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ['brands'] });
          }}
        />
      )}
    </div>
  );
}

function BrandModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    try {
      await api.post('/brands', { name, logo: logo || null });
      onSaved();
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <Modal title="New brand" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Logo URL (optional)">
          <Input value={logo} onChange={(e) => setLogo(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button className="w-full" onClick={save}>
          Create
        </Button>
      </div>
    </Modal>
  );
}
