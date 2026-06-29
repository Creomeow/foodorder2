import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, apiError } from '../lib/api';
import { useSession } from '../store/session';
import { Spinner, Button } from '../components/ui';

// QR landing: resolves the table token, opens a dine-in session, then -> menu.
export default function TableEntry() {
  const { qrToken } = useParams();
  const navigate = useNavigate();
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
        navigate('/menu', { replace: true });
      })
      .catch((err) => setError(apiError(err)));
  }, [qrToken, navigate, setDineIn]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-4xl">😕</div>
        <p className="font-semibold text-gray-800">{error}</p>
        <Button variant="outline" onClick={() => navigate('/')}>
          Go back
        </Button>
      </div>
    );
  }
  return <Spinner label="Opening your table…" />;
}
