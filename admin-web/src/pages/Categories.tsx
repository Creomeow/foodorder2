import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Category } from '@foodorder/shared';
import { api, apiError } from '../lib/api';
import { useTenant } from '../store/tenant';
import { Button, Card, Field, Input, Modal, PageHeader, Spinner } from '../components/ui';

export default function Categories() {
  const { restaurantId } = useTenant();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Category | null>(null);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery<Category[]>({
    queryKey: ['categories', restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => (await api.get('/categories', { params: { restaurantId } })).data,
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories', restaurantId] }),
  });

  return (
    <div>
      <PageHeader
        title="Categories"
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            + New category
          </Button>
        }
      />
      {isLoading || !data ? (
        <Spinner />
      ) : (
        <div className="space-y-2">
          {data.map((c) => (
            <Card key={c.id} className="flex items-center justify-between p-3">
              <div>
                <span className="font-semibold">{c.name}</span>
                <span className="ml-2 text-xs text-gray-400">
                  #{c.sortOrder} {c.visible ? '' : '· hidden'}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(c);
                    setOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Button variant="danger" onClick={() => del.mutate(c.id)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
          {data.length === 0 && <p className="py-12 text-center text-gray-400">No categories yet.</p>}
        </div>
      )}

      {open && (
        <CategoryModal
          category={editing}
          restaurantId={restaurantId!}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ['categories', restaurantId] });
          }}
        />
      )}
    </div>
  );
}

function CategoryModal({
  category,
  restaurantId,
  onClose,
  onSaved,
}: {
  category: Category | null;
  restaurantId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(category?.name ?? '');
  const [sortOrder, setSortOrder] = useState(category?.sortOrder ?? 0);
  const [visible, setVisible] = useState(category?.visible ?? true);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    try {
      const body = { name, sortOrder: Number(sortOrder), visible };
      if (category) await api.put(`/categories/${category.id}`, body);
      else await api.post('/categories', { ...body, restaurantId });
      onSaved();
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <Modal title={category ? 'Edit category' : 'New category'} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Sort order">
          <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          Visible to customers
        </label>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button className="w-full" onClick={save}>
          Save
        </Button>
      </div>
    </Modal>
  );
}
