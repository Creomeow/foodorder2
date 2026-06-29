import type { PaymentMethod } from '@foodorder/shared';

export interface CreateIntentParams {
  orderId: string;
  amount: number; // major units (e.g. dollars)
  currency: string;
  method: PaymentMethod;
  metadata?: Record<string, string>;
}

export interface IntentResult {
  provider: 'STRIPE' | 'CASH';
  clientSecret?: string; // for Stripe Payment Element
  paymentIntentId?: string;
  status: 'PENDING' | 'PAID';
}

/** A payment provider. Implementations: Stripe (live), Cash (internal record). */
export interface PaymentProvider {
  readonly name: 'STRIPE' | 'CASH';
  createIntent(params: CreateIntentParams): Promise<IntentResult>;
}
