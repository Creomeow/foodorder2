import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ModifierGroup } from '@foodorder/shared';
import { api, apiError } from '../lib/api';
import { useTenant } from '../store/tenant';
import { Button, Card, Field, Input, Modal, PageHeader, Spinner } from '../components/ui';
import { money } from '../lib/format';

interface OptionDraft {
  name: string;
  price: number;
  isDefault: boolean;
}

export default function Modifiers() {
  const { restaurantId, currency } = useTenant();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ModifierGroup | null>(null);

  const { data, isLoading } = useQuery<ModifierGroup[]>({
    queryKey: ['modifiers', restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => (await api.get('/modifier-groups', { params: { restaurantId } })).data,
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/modifier-groups/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['modifiers', restaurantId] }),
  });

  return (
    <div>
      <PageHeader
        title="Modifier groups"
        subtitle="Reusable options like Size, Protein, Add-ons"
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            + New group
          </Button>
        }
      />
      {isLoading || !data ? (
        <Spinner />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((g) => (
            <Card key={g.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{g.name}</p>
                  <p className="text-xs text-gray-400">
                    {g.required ? 'Required' : 'Optional'} · {g.multiple ? `up to ${g.maxSelect}` : 'single'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setEditing(g); setOpen(true); }}>
                    Edit
                  </Button>
                  <Button variant="danger" onClick={() => del.mutate(g.id)}>
                    Delete
                  </Button>
                </div>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-gray-600">
                {g.options.map((o) => (
                  <li key={o.id} className="flex justify-between">
                    <span>
                      {o.name} {o.isDefault && <span className="text-xs text-brand">(default)</span>}
                    </span>
                    <span>{Number(o.price) > 0 ? `+${money(Number(o.price), currency)}` : '—'}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {open && (
        <GroupModal
          group={editing}
          restaurantId={restaurantId!}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ['modifiers', restaurantId] });
          }}
        />
      )}
    </div>
  );
}

function GroupModal({
  group,
  restaurantId,
  onClose,
  onSaved,
}: {
  group: ModifierGroup | null;
  restaurantId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(group?.name ?? '');
  const [required, setRequired] = useState(group?.required ?? false);
  const [multiple, setMultiple] = useState(group?.multiple ?? false);
  const [maxSelect, setMaxSelect] = useState(group?.maxSelect ?? 1);
  const [options, setOptions] = useState<OptionDraft[]>(
    group?.options.map((o) => ({ name: o.name, price: Number(o.price), isDefault: o.isDefault })) ?? [
      { name: '', price: 0, isDefault: false },
    ],
  );
  const [error, setError] = useState<string | null>(null);

  function updateOption(i: number, patch: Partial<OptionDraft>) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  }

  async function save() {
    setError(null);
    const cleaned = options.filter((o) => o.name.trim());
    if (!cleaned.length) return setError('Add at least one option');
    try {
      const body = {
        name,
        required,
        multiple,
        minSelect: required ? 1 : 0,
        maxSelect: multiple ? Number(maxSelect) : 1,
        options: cleaned.map((o, i) => ({ ...o, price: Number(o.price), sortOrder: i })),
      };
      if (group) await api.put(`/modifier-groups/${group.id}`, body);
      else await api.post('/modifier-groups', { ...body, restaurantId });
      onSaved();
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <Modal title={group ? 'Edit group' : 'New modifier group'} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
            Required
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={multiple} onChange={(e) => setMultiple(e.target.checked)} />
            Multiple
          </label>
          {multiple && (
            <label className="flex items-center gap-1.5">
              Max
              <input
                type="number"
                value={maxSelect}
                onChange={(e) => setMaxSelect(Number(e.target.value))}
                className="w-16 rounded border border-gray-300 px-2 py-1"
              />
            </label>
          )}
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-gray-600">Options</p>
          <div className="space-y-2">
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder="Name"
                  value={o.name}
                  onChange={(e) => updateOption(i, { name: e.target.value })}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="+$"
                  value={o.price}
                  onChange={(e) => updateOption(i, { price: Number(e.target.value) })}
                  className="w-24"
                />
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={o.isDefault}
                    onChange={(e) => updateOption(i, { isDefault: e.target.checked })}
                  />
                  def
                </label>
                <button onClick={() => setOptions((p) => p.filter((_, idx) => idx !== i))} className="text-red-400">
                  ✕
                </button>
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            className="mt-2"
            onClick={() => setOptions((p) => [...p, { name: '', price: 0, isDefault: false }])}
          >
            + Add option
          </Button>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button className="w-full" onClick={save}>
          Save
        </Button>
      </div>
    </Modal>
  );
}
