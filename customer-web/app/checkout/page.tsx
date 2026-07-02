'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { MenuResponse, OrderType, PaymentMethod } from '@foodorder/shared';
import { api, apiError } from '../../lib/api';
import { useCart, lineUnitPrice } from '../../store/cart';
import { useSession } from '../../store/session';
import { Button } from '../../components/ui';
import { money } from '../../lib/format';

const METHOD_LABEL: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Credit / Debit Card',
  PAYNOW: 'PayNow',
  GRABPAY: 'GrabPay',
};

export default function Checkout() {
  const router = useRouter();
  const session = useSession();
  const { lines, subtotal, clear } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [name, setName] = useState(session.customerName);
  const [phone, setPhone] = useState(session.customerPhone);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  const { data } = useQuery<MenuResponse>({
    queryKey: ['menu', session.restaurantId],
    enabled: !!session.restaurantId,
    queryFn: async () => (await api.get(`/public/outlet/${session.restaurantId}/menu`)).data,
  });

  const restaurant = data?.restaurant;
  const methods = (restaurant?.paymentMethods ?? ['CASH']) as PaymentMethod[];
  const currency = restaurant?.currency ?? 'SGD';

  const totals = useMemo(() => {
    const sub = subtotal();
    const taxable = Math.max(0, sub - discount);
    const tax = restaurant ? (taxable * Number(restaurant.taxRate)) / 100 : 0;
    const svc = restaurant ? (taxable * Number(restaurant.serviceCharge)) / 100 : 0;
    return { sub, tax, svc, total: taxable + tax + svc };
  }, [subtotal, discount, restaurant]);

  useEffect(() => {
    if (lines.length === 0) router.replace('/menu');
  }, [lines.length, router]);

  async function checkCoupon() {
    setCouponMsg(null);
    if (!couponCode.trim() || !session.restaurantId) return;
    try {
      const { data: res } = await api.post('/coupons/validate', {
        code: couponCode.trim(),
        restaurantId: session.restaurantId,
        subtotal: subtotal(),
      });
      if (res.valid) {
        setDiscount(res.discount);
        setCouponMsg(`Coupon applied: −${money(res.discount, currency)}`);
      } else {
        setDiscount(0);
        setCouponMsg(res.message ?? 'Invalid coupon');
      }
    } catch (err) {
      setCouponMsg(apiError(err));
    }
  }

  async function placeOrder() {
    setError(null);
    if (!method) return setError('Choose a payment method');
    if (session.mode === 'TAKEAWAY' && (!name || !phone)) {
      return setError('Name and phone are required for takeaway');
    }
    setPlacing(true);
    try {
      const scheduledFor =
        session.mode === 'TAKEAWAY' && session.serviceTime === 'LATER' && session.scheduledFor
          ? new Date(session.scheduledFor).toISOString()
          : null;
      const payload = {
        restaurantId: session.restaurantId,
        orderType: session.mode as OrderType,
        sessionId: session.sessionId,
        tableId: session.tableId,
        customerName: name || null,
        customerPhone: phone || null,
        couponCode: couponCode.trim() || null,
        scheduledFor,
        items: lines.map((l) => ({
          menuItemId: l.menuItemId,
          quantity: l.quantity,
          notes: l.notes || null,
          modifiers: l.modifiers.map((m) => ({ modifierOptionId: m.optionId })),
        })),
      };
      const { data: order } = await api.post('/public/orders', payload);
      clear();

      if (method === 'CASH') {
        await api.post('/payments/cash', { orderId: order.id });
        router.replace(`/order/${order.id}`);
      } else {
        router.replace(`/pay/${order.id}?method=${method}`);
      }
    } catch (err) {
      setError(apiError(err));
      setPlacing(false);
    }
  }

  if (lines.length === 0) return null;

  const scheduledLabel =
    session.mode === 'TAKEAWAY' && session.serviceTime === 'LATER' && session.scheduledFor
      ? new Date(session.scheduledFor).toLocaleString('en-SG', {
          weekday: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-3 bg-white px-4 py-4">
        <button onClick={() => router.push('/cart')} className="text-sm text-gray-400">
          ←
        </button>
        <h1 className="text-lg font-bold">Checkout</h1>
      </header>

      <main className="flex-1 space-y-5 px-4 py-2">
        {/* Order type */}
        <div className="rounded-2xl bg-gray-50 p-3 text-sm">
          {session.mode === 'DINE_IN' ? (
            <span className="font-medium">Dine in · Table {session.tableNumber}</span>
          ) : (
            <span className="font-medium">Takeaway{scheduledLabel ? ` · Scheduled for ${scheduledLabel}` : ' · Today ASAP'}</span>
          )}
        </div>

        {/* Customer details */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">
            Contact details {session.mode === 'TAKEAWAY' ? '(required)' : '(optional)'}
          </h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand focus:outline-none"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
            inputMode="tel"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand focus:outline-none"
          />
        </div>

        {/* Coupon */}
        <div>
          <h2 className="mb-2 text-sm font-semibold">Promo code</h2>
          <div className="flex gap-2">
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="WELCOME10"
              className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm uppercase focus:border-brand focus:outline-none"
            />
            <Button variant="outline" onClick={checkCoupon}>
              Apply
            </Button>
          </div>
          {couponMsg && (
            <p className={`mt-1 text-xs ${discount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {couponMsg}
            </p>
          )}
        </div>

        {/* Payment method */}
        <div>
          <h2 className="mb-2 text-sm font-semibold">Payment method</h2>
          <div className="space-y-2">
            {methods.map((m) => (
              <label
                key={m}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
                  method === m ? 'border-brand bg-brand-50' : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="method"
                  checked={method === m}
                  onChange={() => setMethod(m)}
                  className="accent-brand"
                />
                {METHOD_LABEL[m] ?? m}
              </label>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-1.5 rounded-2xl bg-gray-50 p-4 text-sm">
          <Row label="Subtotal" value={money(totals.sub, currency)} />
          {discount > 0 && <Row label="Discount" value={`−${money(discount, currency)}`} />}
          <Row label={`Tax (${Number(restaurant?.taxRate ?? 0)}%)`} value={money(totals.tax, currency)} />
          <Row
            label={`Service (${Number(restaurant?.serviceCharge ?? 0)}%)`}
            value={money(totals.svc, currency)}
          />
          <div className="my-1 border-t border-gray-200" />
          <Row label="Total" value={money(totals.total, currency)} bold />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </main>

      <div className="sticky bottom-0 border-t border-gray-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button className="w-full" disabled={placing} onClick={placeOrder}>
          {placing ? 'Placing order…' : `Place order · ${money(totals.total, currency)}`}
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? 'text-base font-bold' : 'text-gray-600'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
