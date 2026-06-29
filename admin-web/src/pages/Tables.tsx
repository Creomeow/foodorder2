import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import type { Table } from '@foodorder/shared';
import { api, apiError } from '../lib/api';
import { useTenant } from '../store/tenant';
import { Button, Card, Field, Input, Modal, PageHeader, Spinner } from '../components/ui';

export default function Tables() {
  const { restaurantId } = useTenant();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Table | null>(null);
  const [qrTable, setQrTable] = useState<Table | null>(null);

  const { data, isLoading } = useQuery<Table[]>({
    queryKey: ['tables', restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => (await api.get('/tables', { params: { restaurantId } })).data,
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/tables/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tables', restaurantId] }),
  });
  const regen = useMutation({
    mutationFn: (id: string) => api.post(`/tables/${id}/qr/regenerate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tables', restaurantId] }),
  });

  return (
    <div>
      <PageHeader
        title="Tables & QR"
        action={
          <Button onClick={() => { setEditing(null); setOpen(true); }}>+ New table</Button>
        }
      />
      {isLoading || !data ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {data.map((t) => (
            <Card key={t.id} className="p-4 text-center">
              <p className="text-2xl font-extrabold">{t.tableNumber}</p>
              <p className="text-xs text-gray-400">Seats {t.capacity} · {t.status}</p>
              <div className="mt-3 space-y-1.5">
                <Button variant="primary" className="w-full" onClick={() => setQrTable(t)}>
                  QR code
                </Button>
                <div className="flex gap-1.5">
                  <Button variant="outline" className="flex-1" onClick={() => { setEditing(t); setOpen(true); }}>
                    Edit
                  </Button>
                  <Button variant="ghost" onClick={() => del.mutate(t.id)}>🗑</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {open && (
        <TableModal
          table={editing}
          restaurantId={restaurantId!}
          onClose={() => setOpen(false)}
          onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ['tables', restaurantId] }); }}
        />
      )}
      {qrTable && (
        <QrModal table={qrTable} onClose={() => setQrTable(null)} onRegenerate={() => regen.mutate(qrTable.id)} />
      )}
    </div>
  );
}

function TableModal({
  table,
  restaurantId,
  onClose,
  onSaved,
}: {
  table: Table | null;
  restaurantId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tableNumber, setTableNumber] = useState(table?.tableNumber ?? '');
  const [capacity, setCapacity] = useState(table?.capacity ?? 2);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    try {
      const body = { tableNumber, capacity: Number(capacity) };
      if (table) await api.put(`/tables/${table.id}`, body);
      else await api.post('/tables', { ...body, restaurantId });
      onSaved();
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <Modal title={table ? 'Edit table' : 'New table'} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Table number">
          <Input value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} />
        </Field>
        <Field label="Capacity">
          <Input type="number" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
        </Field>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button className="w-full" onClick={save}>Save</Button>
      </div>
    </Modal>
  );
}

function QrModal({
  table,
  onClose,
  onRegenerate,
}: {
  table: Table;
  onClose: () => void;
  onRegenerate: () => void;
}) {
  const url = table.qrUrl ?? '';
  const [dataUrl, setDataUrl] = useState<string>('');

  // Generate the QR client-side from the table URL.
  useEffect(() => {
    QRCode.toDataURL(url, { width: 320, margin: 1 }).then(setDataUrl).catch(() => {});
  }, [url]);

  function download() {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `table-${table.tableNumber}-qr.png`;
    a.click();
  }

  function print() {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(
      `<html><body style="text-align:center;font-family:sans-serif;padding:40px">
        <h1>Table ${table.tableNumber}</h1>
        <img src="${dataUrl}" style="width:320px"/>
        <p>${url}</p>
      </body></html>`,
    );
    w.document.close();
    w.print();
  }

  return (
    <Modal title={`Table ${table.tableNumber} — QR`} onClose={onClose}>
      <div className="space-y-4 text-center">
        {dataUrl ? (
          <img src={dataUrl} alt="QR" className="mx-auto rounded-lg border" />
        ) : (
          <Spinner />
        )}
        <p className="break-all text-xs text-gray-400">{url}</p>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={download}>Download</Button>
          <Button variant="outline" className="flex-1" onClick={print}>Print</Button>
        </div>
        <Button variant="danger" className="w-full" onClick={onRegenerate}>
          Regenerate QR (invalidates old)
        </Button>
      </div>
    </Modal>
  );
}
