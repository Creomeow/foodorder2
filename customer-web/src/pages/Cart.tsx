import { useNavigate } from 'react-router-dom';
import { useCart, lineUnitPrice } from '../store/cart';
import { useSession } from '../store/session';
import { Button, EmptyState } from '../components/ui';
import { money } from '../lib/format';

export default function Cart() {
  const navigate = useNavigate();
  const { lines, setQuantity, remove, subtotal } = useCart();
  const restaurantId = useSession((s) => s.restaurantId);

  if (lines.length === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header onBack={() => navigate(-1)} />
        <EmptyState title="Your cart is empty" subtitle="Add some dishes to get started." />
        <div className="p-4">
          <Button variant="outline" className="w-full" onClick={() => navigate('/menu')}>
            Back to menu
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header onBack={() => navigate('/menu')} />
      <main className="flex-1 px-4 py-3">
        <div className="space-y-3">
          {lines.map((l) => (
            <div key={l.key} className="rounded-2xl border border-gray-100 p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{l.name}</p>
                  {l.modifiers.length > 0 && (
                    <p className="mt-0.5 text-xs text-gray-500">
                      {l.modifiers.map((m) => m.name).join(', ')}
                    </p>
                  )}
                  {l.notes && <p className="mt-0.5 text-xs italic text-gray-400">"{l.notes}"</p>}
                </div>
                <button onClick={() => remove(l.key)} className="text-xs text-red-400">
                  Remove
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center rounded-lg border border-gray-200">
                  <button className="px-3 py-1.5" onClick={() => setQuantity(l.key, l.quantity - 1)}>
                    −
                  </button>
                  <span className="w-7 text-center text-sm font-semibold">{l.quantity}</span>
                  <button className="px-3 py-1.5" onClick={() => setQuantity(l.key, l.quantity + 1)}>
                    +
                  </button>
                </div>
                <span className="text-sm font-bold">{money(lineUnitPrice(l) * l.quantity)}</span>
              </div>
            </div>
          ))}
        </div>
      </main>

      <div className="sticky bottom-0 border-t border-gray-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="text-gray-500">Subtotal</span>
          <span className="font-semibold">{money(subtotal())}</span>
        </div>
        <Button className="w-full" disabled={!restaurantId} onClick={() => navigate('/checkout')}>
          Go to checkout
        </Button>
      </div>
    </div>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 bg-white px-4 py-4">
      <button onClick={onBack} className="text-sm text-gray-400">
        ←
      </button>
      <h1 className="text-lg font-bold">Your order</h1>
    </header>
  );
}
