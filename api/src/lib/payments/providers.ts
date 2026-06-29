import { badRequest } from '../errors.js';
import type { CreateIntentParams, IntentResult, PaymentProvider } from './types.js';
import { stripe, STRIPE_METHOD_TYPES } from './stripe.js';

class StripeProvider implements PaymentProvider {
  readonly name = 'STRIPE' as const;

  async createIntent(params: CreateIntentParams): Promise<IntentResult> {
    if (!stripe) throw badRequest('Stripe is not configured');
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(params.amount * 100), // smallest currency unit
      currency: params.currency,
      payment_method_types: STRIPE_METHOD_TYPES[params.method] ?? ['card'],
      metadata: { orderId: params.orderId, ...params.metadata },
    });
    return {
      provider: 'STRIPE',
      clientSecret: intent.client_secret ?? undefined,
      paymentIntentId: intent.id,
      status: 'PENDING',
    };
  }
}

class CashProvider implements PaymentProvider {
  readonly name = 'CASH' as const;

  async createIntent(_params: CreateIntentParams): Promise<IntentResult> {
    // Cash is settled at the counter; we just record a pending payment.
    return { provider: 'CASH', status: 'PENDING' };
  }
}

export const stripeProvider = new StripeProvider();
export const cashProvider = new CashProvider();

// Future providers (HitPay, Xendit) implement PaymentProvider and slot in here.
export function getProvider(method: 'CARD' | 'PAYNOW' | 'GRABPAY' | 'CASH'): PaymentProvider {
  return method === 'CASH' ? cashProvider : stripeProvider;
}
