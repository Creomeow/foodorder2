import Stripe from 'stripe';
import { env } from '../../config/env.js';

// Singleton Stripe client. Null when no key configured (cash-only mode).
// apiVersion omitted -> uses the account's default pinned version.
export const stripe: Stripe | null = env.stripe.enabled
  ? new Stripe(env.stripe.secretKey)
  : null;

// Map our PaymentMethod -> Stripe payment_method_types.
export const STRIPE_METHOD_TYPES: Record<string, string[]> = {
  CARD: ['card'],
  PAYNOW: ['paynow'],
  GRABPAY: ['grabpay'],
};
