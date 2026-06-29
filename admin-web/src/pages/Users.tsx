import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Role, type AuthUser } from '@foodorder/shared';
import { api, apiError } from '../lib/api';
import { useAuth } from '../store/auth';
import { useRestaurants } from '../lib/hooks';
import { Button, Card, Field, Input, Modal, PageHeader, Select, Spinner } from '../components/ui';

type StaffUser = AuthUser & { active: boolean };

export default function Users() {
  const qc = useQueryClient();
  const me = useAuth((s) => s.user);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery<StaffUser[]>({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  return (
    <div>
      <PageHeader title="Users" action={<Button onClick={() => setOpen(true)}>+ New user</Button>} />
      {isLoading || !data ? (
        <Spinner />
      ) : (
        <div className="space-y-2">
          {data.map((u) => (
            <Card key={u.id} className="flex items-center justify-between p-3">
              <div>
                <p className="font-semibold">
                  {u.name} {u.id === me?.id && <span className="text-xs text-gray-400">(you)</span>}
                </p>
                <p className="text-xs text-gray-400">
                  {u.email} · {u.role}
                </p>
              </div>
              {u.id !== me?.id && (
                <Button variant="danger" onClick={() => del.mutate(u.id)}>
                  Delete
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
      {open && (
        <UserModal
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ['users'] });
          }}
        />
      )}
    </div>
  );
}

function UserModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const me = useAuth((s) => s.user);
  const { data: restaurants } = useRestaurants();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: Role.STAFF as Role,
    restaurantId: '',
  });
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const assignableRoles =
    me?.role === Role.SUPER_ADMIN
      ? [Role.SUPER_ADMIN, Role.MANAGER, Role.STAFF]
      : [Role.MANAGER, Role.STAFF];

  async function save() {
    setError(null);
    try {
      await api.post('/users', {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        restaurantId: form.role === Role.STAFF ? form.restaurantId || null : null,
      });
      onSaved();
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <Modal title="New user" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Name">
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Password">
          <Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} />
        </Field>
        <Field label="Role">
          <Select value={form.role} onChange={(e) => set('role', e.target.value as Role)}>
            {assignableRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </Field>
        {form.role === Role.STAFF && (
          <Field label="Outlet">
            <Select value={form.restaurantId} onChange={(e) => set('restaurantId', e.target.value)}>
              <option value="">Select outlet…</option>
              {restaurants?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button className="w-full" onClick={save}>
          Create user
        </Button>
      </div>
    </Modal>
  );
}
