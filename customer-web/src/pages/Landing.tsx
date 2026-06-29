import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <div>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-3xl">
          🍜
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Tertiary Eats</h1>
        <p className="mt-1 text-sm text-gray-500">Scan the QR code on your table to start ordering, or order for takeaway.</p>
      </div>
      <div className="w-full max-w-xs space-y-3">
        <Button className="w-full" onClick={() => navigate('/takeaway')}>
          Order Takeaway
        </Button>
        <p className="text-xs text-gray-400">
          Dining in? Scan the QR code on your table — it opens this app at <code>/table/&lt;code&gt;</code>.
        </p>
      </div>
    </div>
  );
}
