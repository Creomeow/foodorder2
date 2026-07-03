'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { api, apiError, API_URL } from '../../../lib/api';
import { Button, Spinner } from '../../../components/ui';

let stripePromise: Promise<Stripe | null> | null = null;
async function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key =
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??
      (await api.get('/payments/config')).data.publishableKey;
    stripePromise = key ? loadStripe(key) : Promise.resolve(null);
  }
  return stripePromise;
}

function PayContent() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId === '_' && typeof window !== 'undefined'
    ? window.location.pathname.split('/')[2]
    : params.orderId;
  const params = useSearchParams();
  const method = params.get('method') ?? 'CARD';
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripe, setStripeInstance] = useState<Stripe | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [{ data }, stripeInst] = await Promise.all([
          api.post('/payments/intent', { orderId, method }),
          getStripe(),
        ]);
        if (!mounted) return;
        if (!data.clientSecret) {
          setError('Stripe is not configured on the server. Use cash, or set Stripe keys.');
          return;
        }
        setClientSecret(data.clientSecret);
        setStripeInstance(stripeInst);
      } catch (err) {
        setError(apiError(err));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [orderId, method]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-4xl">💳</div>
        <p className="font-semibold text-gray-800">{error}</p>
        <Button variant="outline" onClick={() => router.push(`/order/${orderId}`)}>
          View order
        </Button>
      </div>
    );
  }

  if (!clientSecret || !stripe) return <Spinner label="Preparing payment…" />;

  return (
    <div className="flex min-h-screen flex-col px-4 py-6">
      <h1 className="mb-1 text-lg font-bold">Pay for your order</h1>
      <p className="mb-6 text-sm text-gray-500">Secure payment via Stripe ({method}).</p>
      <Elements stripe={stripe} options={{ clientSecret }}>
        <PaymentForm
          returnUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/order/${orderId}`}
          onDone={() => router.replace(`/order/${orderId}`)}
        />
      </Elements>
      <p className="mt-4 text-center text-xs text-gray-400">API: {API_URL}</p>
    </div>
  );
}

function PaymentForm({ returnUrl, onDone }: { returnUrl: string; onDone: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setErr(null);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: 'if_required',
    });
    if (error) {
      setErr(error.message ?? 'Payment failed');
      setSubmitting(false);
    } else {
      onDone();
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <PaymentElement />
      {err && <p className="text-sm text-red-500">{err}</p>}
      <Button type="submit" className="w-full" disabled={!stripe || submitting}>
        {submitting ? 'Processing…' : 'Pay now'}
      </Button>
    </form>
  );
}

export default function Pay() {
  return (
    <Suspense>
      <PayContent />
    </Suspense>
  );
}
