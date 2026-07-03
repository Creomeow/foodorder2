# Deployment Guide

This is a monorepo with three apps that share one PostgreSQL database:

- **api** — Express + Prisma + Socket.IO + Stripe (port 4000)
- **customer-web** — Vite/React customer ordering app
- **admin-web** — Vite/React admin dashboard + Kitchen Display (KDS)

## 1. Prerequisites

- Node.js 20+ and npm (for local dev)
- Docker + Docker Compose (for containerised deploy)
- A PostgreSQL 14+ database
- (Optional) Stripe **test** account for card/PayNow/GrabPay payments

## 2. Local development

```bash
# 1. Install all workspace deps
npm install

# 2. Configure env
cp .env.example .env          # fill in DATABASE_URL, JWT secrets, Stripe keys

# 3. Start Postgres (or use the compose db only)
docker compose up -d db

# 4. Create schema + seed demo data
npm run db:push
npm run db:seed               # prints the seeded outlet id + demo logins

# 5. Run the three apps (separate terminals)
npm run dev:api               # http://localhost:4000  (docs: /api/docs)
npm run dev:customer          # http://localhost:5173
npm run dev:admin             # http://localhost:5174
```

Set each frontend's API URL via `customer-web/.env` (Next.js) and `admin-web/.env` (Vite):

```
# customer-web/.env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
NEXT_PUBLIC_DEFAULT_RESTAURANT_ID=<seeded outlet id> # enables /takeaway without a QR

# admin-web/.env
VITE_API_URL=http://localhost:4000
```

**Demo logins** (from the seed):

| Role        | Email                      | Password    |
| ----------- | -------------------------- | ----------- |
| Super Admin | superadmin@foodorder.dev   | Admin123!   |
| Manager     | manager@foodorder.dev      | Manager123! |
| Staff       | staff@foodorder.dev        | Staff123!   |

## 3. Stripe (real payments)

1. Get test keys from https://dashboard.stripe.com/test/apikeys and set
   `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` (and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`).
2. Forward webhooks locally and copy the signing secret into `STRIPE_WEBHOOK_SECRET`:
   ```bash
   stripe listen --forward-to localhost:4000/api/v1/payments/webhook
   ```
3. PayNow / GrabPay require the Stripe account to be SGD-enabled.

Without keys the API runs in **cash-only** mode (card/PayNow/GrabPay are disabled).

## 4. Containerised deploy (single host)

```bash
cp .env.example .env          # set JWT secrets, Stripe keys, PUBLIC_URL
docker compose up -d --build
```

`docker compose` brings up `db`, `api`, `customer-web`, `admin-web`, and an `nginx`
reverse proxy on port 80:

- `http://localhost/`        → customer ordering app
- `http://localhost/admin/`  → admin dashboard + KDS
- `http://localhost/api/`    → REST API (`/api/docs` for Swagger)
- `/socket.io/`              → realtime

Frontends are built with a **relative** API URL, so all traffic flows through nginx
on the same origin. Override the public origin with `PUBLIC_URL` (used for CORS and
QR-code generation), e.g. `PUBLIC_URL=https://order.yourdomain.com`.

Seed the database once the stack is up:

```bash
docker compose exec api npx tsx prisma/seed.ts
```

### Compose env vars

| Var                     | Default                | Purpose                          |
| ----------------------- | ---------------------- | -------------------------------- |
| `PUBLIC_URL`            | http://localhost       | Public origin (CORS + QR URLs)   |
| `HTTP_PORT`             | 80                     | nginx port                       |
| `DB_PORT`               | 6436                   | Exposed Postgres port            |
| `JWT_ACCESS_SECRET`     | (change me)            | Access-token secret              |
| `JWT_REFRESH_SECRET`    | (change me)            | Refresh-token secret             |
| `STRIPE_*`              | empty                  | Stripe keys (cash-only if unset) |
| `DEFAULT_RESTAURANT_ID` | empty                  | Default outlet for /takeaway     |

## 5. Production notes

- Use managed Postgres and switch to `prisma migrate deploy` with committed
  migrations (`npm run db:migrate` locally to create them).
- Put TLS in front of nginx (e.g. Caddy, a load balancer, or certbot).
- Rotate JWT secrets and set strong values.
- Scale `api` horizontally behind a sticky-session or Redis Socket.IO adapter if
  you run multiple API replicas (single replica needs nothing extra).
