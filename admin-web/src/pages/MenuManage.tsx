import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Category, MenuItem, ModifierGroup } from '@foodorder/shared';
import { api, apiError } from '../lib/api';
import { useTenant } from '../store/tenant';
import { Button, Card, Field, Input, Modal, PageHeader, Select, Spinner } from '../components/ui';
import { money } from '../lib/format';

export default function MenuManage() {
  const { restaurantId, currency } = useTenant();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);

  const items = useQuery<MenuItem[]>({
    queryKey: ['menu', restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => (await api.get('/menu', { params: { restaurantId } })).data,
  });
  const categories = useQuery<Category[]>({
    queryKey: ['categories', restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => (await api.get('/categories', { params: { restaurantId } })).data,
  });
  const groups = useQuery<ModifierGroup[]>({
    queryKey: ['modifiers', restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => (await api.get('/modifier-groups', { params: { restaurantId } })).data,
  });

  const toggle = useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) =>
      api.put(`/menu/${id}`, { available }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu', restaurantId] }),
  });
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/menu/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu', restaurantId] }),
  });

  const catName = (id: string) => categories.data?.find((c) => c.id === id)?.name ?? '—';

  return (
    <div>
      <PageHeader
        title="Menu"
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            + New item
          </Button>
        }
      />
      {items.isLoading || !items.data ? (
        <Spinner />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.data.map((it) => (
            <Card key={it.id} className="flex gap-3 p-3">
              {it.imageUrl && (
                <img src={it.imageUrl} alt={it.name} className="h-16 w-16 rounded-lg object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate font-semibold">{it.name}</p>
                  <span className="font-bold">{money(Number(it.price), currency)}</span>
                </div>
                <p className="text-xs text-gray-400">{catName(it.categoryId)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    variant={it.available ? 'outline' : 'danger'}
                    onClick={() => toggle.mutate({ id: it.id, available: !it.available })}
                  >
                    {it.available ? 'Available' : 'Sold out'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditing(it);
                      setOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button variant="ghost" onClick={() => del.mutate(it.id)}>
                    🗑
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {open && categories.data && (
        <ItemModal
          item={editing}
          restaurantId={restaurantId!}
          categories={categories.data}
          groups={groups.data ?? []}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ['menu', restaurantId] });
          }}
        />
      )}
    </div>
  );
}

function ItemModal({
  item,
  restaurantId,
  categories,
  groups,
  onClose,
  onSaved,
}: {
  item: MenuItem | null;
  restaurantId: string;
  categories: Category[];
  groups: ModifierGroup[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: item?.name ?? '',
    description: item?.description ?? '',
    price: item?.price ?? 0,
    imageUrl: item?.imageUrl ?? '',
    categoryId: item?.categoryId ?? categories[0]?.id ?? '',
    available: item?.available ?? true,
    popular: item?.popular ?? false,
    recommended: item?.recommended ?? false,
  });
  const [selectedGroups, setSelectedGroups] = useState<string[]>(
    item?.modifierGroups?.map((g) => g.id) ?? [],
  );
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setError(null);
    try {
      const body = {
        ...form,
        price: Number(form.price),
        description: form.description || null,
        imageUrl: form.imageUrl || null,
        modifierGroupIds: selectedGroups,
      };
      if (item) await api.put(`/menu/${item.id}`, body);
      else await api.post('/menu', { ...body, restaurantId });
      onSaved();
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <Modal title={item ? 'Edit item' : 'New item'} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Name">
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Description">
          <Input value={form.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price">
            <Input type="number" step="0.01" value={form.price} onChange={(e) => set('price', Number(e.target.value))} />
          </Field>
          <Field label="Category">
            <Select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Image URL">
          <Input value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://…" />
        </Field>

        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={form.available} onChange={(e) => set('available', e.target.checked)} />
            Available
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={form.popular} onChange={(e) => set('popular', e.target.checked)} />
            Popular
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={form.recommended} onChange={(e) => set('recommended', e.target.checked)} />
            Recommended
          </label>
        </div>

        {groups.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium text-gray-600">Modifier groups</p>
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => {
                const on = selectedGroups.includes(g.id);
                return (
                  <button
                    key={g.id}
                    onClick={() =>
                      setSelectedGroups((prev) =>
                        on ? prev.filter((x) => x !== g.id) : [...prev, g.id],
                      )
                    }
                    className={`rounded-full px-3 py-1 text-xs ${
                      on ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button className="w-full" onClick={save}>
          Save
        </Button>
      </div>
    </Modal>
  );
}
