'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api, apiError } from '../../../lib/api';
import { useSession } from '../../../store/session';
import { Spinner, Button } from '../../../components/ui';

// QR landing: resolves the table token, opens a dine-in session, then -> welcome.
export default function TableEntry() {
  const { qrToken } = useParams<{ qrToken: string }>();
  const router = useRouter();
  const setDineIn = useSession((s) => s.setDineIn);
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || !qrToken) return;
    ran.current = true;
    api
      .post('/public/sessions', { qrToken })
      .then(({ data }) => {
        setDineIn({
          restaurantId: data.restaurant.id,
          restaurantName: data.restaurant.name,
          tableId: data.table.id,
          tableNumber: data.table.tableNumber,
          sessionId: data.sessionId,
        });
        router.replace('/welcome');
      })
      .catch((err) => setError(apiError(err)));
  }, [qrToken, router, setDineIn]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-4xl">😕</div>
        <p className="font-semibold text-gray-800">{error}</p>
        <Button variant="outline" onClick={() => router.push('/')}>
          Go back
        </Button>
      </div>
    );
  }
  return <Spinner label="Opening your table…" />;
}
