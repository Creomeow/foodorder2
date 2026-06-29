import { Router, type Request, type Response } from 'express';
import { paymentIntentSchema, cashPaymentSchema, PaymentProvider as PP } from '@foodorder/shared';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok, serialize } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { optionalAuth } from '../../middleware/auth.js';
import { notFound } from '../../lib/errors.js';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { getProvider } from '../../lib/payments/providers.js';
import { stripe } from '../../lib/payments/stripe.js';
import { emitOrderStatus } from '../../realtime/io.js';
import { ORDER_INCLUDE } from '../orders/orders.service.js';

export const paymentsRouter = Router();

// Expose the publishable key + currency for the frontends.
paymentsRouter.get('/config', (_req, res) => {
  ok(res, {
    publishableKey: env.stripe.publishableKey,
    currency: env.stripe.currency,
    stripeEnabled: env.stripe.enabled,
  });
});

// Create a payment intent for an order (card/paynow/grabpay via Stripe).
paymentsRouter.post(
  '/intent',
  optionalAuth,
  validate(paymentIntentSchema),
  asyncHandler(async (req, res) => {
    const { orderId, method } = req.body as { orderId: string; method: 'CARD' | 'PAYNOW' | 'GRABPAY' };
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw notFound('Order not found');

    const restaurant = await prisma.restaurant.findUnique({ where: { id: order.restaurantId } });
    const currency = (restaurant?.currency ?? env.stripe.currency).toLowerCase();

    const provider = getProvider(method);
    const result = await provider.createIntent({
      orderId,
      amount: Number(order.total),
      currency,
      method,
    });

    // Record (or upsert) a pending payment row.
    await prisma.payment.create({
      data: {
        orderId,
        provider: PP.STRIPE,
        paymentMethod: method,
        paymentStatus: 'PENDING',
        amount: order.total,
        stripePaymentIntentId: result.paymentIntentId ?? null,
      },
    });

    ok(res, { clientSecret: result.clientSecret, paymentIntentId: result.paymentIntentId });
  }),
);

// Record a cash payment (settled at counter); confirms the order.
paymentsRouter.post(
  '/cash',
  optionalAuth,
  validate(cashPaymentSchema),
  asyncHandler(async (req, res) => {
    const { orderId } = req.body as { orderId: string };
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw notFound('Order not found');

    await prisma.payment.create({
      data: {
        orderId,
        provider: PP.CASH,
        paymentMethod: 'CASH',
        paymentStatus: 'PENDING',
        amount: order.total,
      },
    });

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'CONFIRMED' },
      include: ORDER_INCLUDE,
    });
    emitOrderStatus(updated.restaurantId, serialize(updated));
    ok(res, updated);
  }),
);

/**
 * Stripe webhook. Mounted separately in app.ts with a raw body parser so the
 * signature can be verified. Marks payments paid and confirms orders.
 */
export async function stripeWebhookHandler(req: Request, res: Response) {
  if (!stripe || !env.stripe.webhookSecret) {
    res.status(400).send('Stripe not configured');
    return;
  }
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig as string, env.stripe.webhookSecret);
  } catch (err) {
    logger.warn({ err }, 'stripe webhook signature failed');
    res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    return;
  }

  if (event.type === 'payment_intent.succeeded' || event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object as { id: string; metadata?: { orderId?: string } };
    const paid = event.type === 'payment_intent.succeeded';

    await prisma.payment.updateMany({
      where: { stripePaymentIntentId: intent.id },
      data: {
        paymentStatus: paid ? 'PAID' : 'FAILED',
        transactionReference: intent.id,
      },
    });

    const orderId = intent.metadata?.orderId;
    if (orderId && paid) {
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: { status: 'CONFIRMED' },
        include: ORDER_INCLUDE,
      });
      emitOrderStatus(updated.restaurantId, serialize(updated));
    }
  }

  res.json({ received: true });
}
