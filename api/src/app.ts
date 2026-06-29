import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { openapiSpec } from './docs/openapi.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { stripeWebhookHandler } from './modules/payments/payments.routes.js';

import { authRouter } from './modules/auth/auth.routes.js';
import { brandsRouter } from './modules/brands/brands.routes.js';
import { restaurantsRouter } from './modules/restaurants/restaurants.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { categoriesRouter } from './modules/categories/categories.routes.js';
import { menuRouter } from './modules/menu/menu.routes.js';
import { modifiersRouter } from './modules/modifiers/modifiers.routes.js';
import { tablesRouter } from './modules/tables/tables.routes.js';
import { ordersRouter } from './modules/orders/orders.routes.js';
import { publicRouter } from './modules/public/public.routes.js';
import { paymentsRouter } from './modules/payments/payments.routes.js';
import { couponsRouter } from './modules/coupons/coupons.routes.js';
import { loyaltyRouter } from './modules/loyalty/loyalty.routes.js';
import { reportsRouter } from './modules/reports/reports.routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(pinoHttp({ logger, autoLogging: env.isProd }));

  // Stripe webhook MUST receive the raw body for signature verification —
  // mount it before the JSON parser.
  app.post(
    '/api/v1/payments/webhook',
    express.raw({ type: 'application/json' }),
    stripeWebhookHandler,
  );

  app.use(express.json({ limit: '1mb' }));

  // Rate limiting on the API surface.
  app.use(
    '/api',
    rateLimit({
      windowMs: env.rateLimit.windowMs,
      max: env.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // API docs.
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
  app.get('/api/openapi.json', (_req, res) => res.json(openapiSpec));

  // Routes (v1).
  const v1 = express.Router();
  v1.use('/auth', authRouter);
  v1.use('/brands', brandsRouter);
  v1.use('/restaurants', restaurantsRouter);
  v1.use('/users', usersRouter);
  v1.use('/categories', categoriesRouter);
  v1.use('/menu', menuRouter);
  v1.use('/modifier-groups', modifiersRouter);
  v1.use('/tables', tablesRouter);
  v1.use('/orders', ordersRouter);
  v1.use('/public', publicRouter);
  v1.use('/payments', paymentsRouter);
  v1.use('/coupons', couponsRouter);
  v1.use('/loyalty', loyaltyRouter);
  v1.use('/reports', reportsRouter);
  app.use('/api/v1', v1);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
