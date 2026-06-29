import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Load env from monorepo root (.env) first, then a local api/.env override.
const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, '../../../.env') });
loadEnv({ path: resolve(here, '../../.env'), override: true });

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function optional(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  isProd: optional('NODE_ENV', 'development') === 'production',

  port: parseInt(optional('API_PORT', '4000'), 10),
  apiUrl: optional('API_URL', 'http://localhost:4000'),

  databaseUrl: required('DATABASE_URL'),

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret-change-me-please-32c'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me-please-32'),
    accessTtl: optional('JWT_ACCESS_TTL', '15m'),
    refreshTtl: optional('JWT_REFRESH_TTL', '7d'),
  },

  corsOrigins: optional('CORS_ORIGINS', 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  customerUrl: optional('CUSTOMER_URL', 'http://localhost:5173'),
  adminUrl: optional('ADMIN_URL', 'http://localhost:5174'),

  stripe: {
    secretKey: optional('STRIPE_SECRET_KEY'),
    publishableKey: optional('STRIPE_PUBLISHABLE_KEY'),
    webhookSecret: optional('STRIPE_WEBHOOK_SECRET'),
    currency: optional('STRIPE_CURRENCY', 'sgd'),
    get enabled() {
      return Boolean(process.env.STRIPE_SECRET_KEY);
    },
  },

  rateLimit: {
    windowMs: parseInt(optional('RATE_LIMIT_WINDOW_MS', '900000'), 10),
    max: parseInt(optional('RATE_LIMIT_MAX', '300'), 10),
  },
};
