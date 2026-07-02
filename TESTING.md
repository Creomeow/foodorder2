# Testing Guide

## Local Setup (Docker + dev servers)

### Prerequisites
- Docker Desktop running
- Node.js 20+ and npm installed

### 1. Configure environment

```bash
cp .env.example .env
```

Open `.env` and set at minimum:

```
JWT_ACCESS_SECRET=<run: openssl rand -base64 32>
JWT_REFRESH_SECRET=<run: openssl rand -base64 32>
DEFAULT_RESTAURANT_ID=<seeded outlet id — printed by db:seed>
```

### 2. Start the database

```bash
docker compose up -d db
```

### 3. Push schema and seed demo data

```bash
npm run db:push
npm run db:seed
```

The seed prints the outlet ID — copy it into `.env` as `DEFAULT_RESTAURANT_ID`.

### 4. Configure the customer-web dev env

```bash
cp customer-web/.env.example customer-web/.env.local
```

Edit `customer-web/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_DEFAULT_RESTAURANT_ID=<same outlet id from db:seed>
```

### 5. Start services (three separate terminal tabs)

```bash
# Tab 1 — API
npm run dev:api

# Tab 2 — Customer web (Next.js dev server)
npm run dev --workspace customer-web

# Tab 3 — Admin web (Vite dev server)
npm run dev --workspace admin-web
```

| Service      | URL                          |
| ------------ | ---------------------------- |
| Customer app | http://localhost:5173         |
| Admin / KDS  | http://localhost:5174         |
| API          | http://localhost:4000         |
| API docs     | http://localhost:4000/api/docs |

---

## Demo credentials

| Role        | Email                    | Password    |
| ----------- | ------------------------ | ----------- |
| Super Admin | superadmin@foodorder.dev | Admin123!   |
| Manager     | manager@foodorder.dev    | Manager123! |
| Staff       | staff@foodorder.dev      | Staff123!   |

---

## Test: Dine-In Flow

Open `http://localhost:5173/table/<qrToken>` in a **mobile viewport** (Chrome DevTools → device toolbar).

Seeded QR tokens for Tertiary Eats — Orchard:

| Table | URL |
| ----- | --- |
| 1 | http://localhost:5173/table/cmr0bkh2d002i7a3cv9g1wfik |
| 2 | http://localhost:5173/table/cmr0bkh2e002m7a3cn1d9yxwc |
| 3 | http://localhost:5173/table/cmr0bkh2f002q7a3cw1sxrod7 |

**Steps:**
1. Open a table URL → auto-redirects to `/welcome`
2. **Welcome screen** — verify: restaurant name + "Table Number: 1", promo banners scroll horizontally, "Outlet Info" opens a drawer with hours/address/phone
3. Tap **Confirm** → goes to `/menu`
4. **Menu** — verify: category tabs show item counts `(N)`, service-mode pill shows "Dine In · Table 1"
5. Tap the login banner → "Coming soon" toast appears (no navigation)
6. Add 1–2 items → qty badge appears on those item cards in the menu
7. Open **Cart** → tap **Edit** on a line → modal opens pre-filled → change qty or notes → **Save** → line updates without duplicating
8. Tap **Checkout** → select Cash → **Place order**
9. **Order tracking** page appears with order number and status

---

## Test: Takeaway Flow

1. Open `http://localhost:5173/` → tap **Order Takeaway**
2. Enter name and phone → **Browse menu** → Welcome screen shows "Takeaway order"
3. Tap **Confirm** → `/menu`
4. Tap the **service-mode pill** → ServiceModeModal opens:
   - Delivery and Retail show "Coming soon" and cannot be tapped
   - Switch to **Later** → date/time input appears → set a future time
5. Add items → **Cart** → **Checkout**
6. Checkout shows **"Takeaway · Scheduled for …"** with your chosen time
7. **Place order** → order tracking page

> If you get "Menu item unavailable" or a 400 error, clear stale cart data:
> open DevTools console and run `localStorage.removeItem('foodorder-cart'); location.reload()`

---

## Test: Admin Dashboard

1. Open `http://localhost:5174/` → login with `manager@foodorder.dev` / `Manager123!`
2. **Dashboard** — orders placed in the customer flows appear here
3. Click an order → change its status (Pending → Preparing)
4. Switch to the customer order tracking tab — status updates in real time (Socket.IO)
5. Go to **Coupons** → create one (e.g. code `TEST10`, flat discount $10, min spend $0)
6. Go back to customer checkout, enter `TEST10` → verify discount applies

---

## Test: KDS (Kitchen Display System)

1. In admin, navigate to **KDS** from the sidebar
2. In another tab, place a new dine-in order from the customer app
3. Verify the new order appears on KDS in real time
4. Mark the order as ready from KDS → verify the status updates on the customer order tracking page

---

## Test: Staff Login & RBAC

1. Log out of admin, log in as `staff@foodorder.dev` / `Staff123!`
2. Verify staff can only see orders for their assigned outlet
3. Verify staff cannot access brand-level pages (should redirect or show 403)
4. Log out, log in as `superadmin@foodorder.dev` / `Admin123!` → verify full access across all brands and outlets

---

## Teardown

```bash
# Stop all containers (keeps DB data)
docker compose down

# Stop all containers AND delete DB data (full reset)
docker compose down -v

# Kill dev servers
# Ctrl+C in each terminal tab running npm run dev:*
```

To re-seed after a full reset:
```bash
docker compose up -d db
npm run db:push
npm run db:seed
```

---

---

# Vercel + Neon DB Deployment

## Prerequisites
- Vercel account (vercel.com)
- Neon account (neon.tech) — free tier is sufficient
- GitHub repo connected to Vercel

## 1. Create a Neon database

1. Go to neon.tech → **New Project**
2. Choose a region close to your Vercel deployment region
3. Copy the **connection string** — it looks like:
   ```
   postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

## 2. Deploy the API to Vercel

The API is an Express app — deploy it as a Vercel serverless function or use a platform that supports long-running Node processes (Railway, Render, Fly.io). Vercel works but Socket.IO realtime requires a persistent connection; for full Socket.IO support use **Railway** or **Render** instead.

### Option A — Railway (recommended for Socket.IO)

1. Go to railway.app → **New Project → Deploy from GitHub**
2. Select the repo, set root directory to `/` (monorepo root)
3. Set the start command: `npm run dev:api` (or `npx tsx api/src/server.ts`)
4. Add environment variables (see table below)
5. Railway assigns a public URL — note it as `API_URL`

### Option B — Vercel (API routes only, no Socket.IO)

1. Add a `vercel.json` at the repo root:
   ```json
   {
     "builds": [{ "src": "api/src/server.ts", "use": "@vercel/node" }],
     "routes": [{ "src": "/api/(.*)", "dest": "api/src/server.ts" }]
   }
   ```
2. Deploy via `vercel --prod`

## 3. Set API environment variables

| Variable                  | Value                                      |
| ------------------------- | ------------------------------------------ |
| `DATABASE_URL`            | Neon connection string (with `?sslmode=require`) |
| `JWT_ACCESS_SECRET`       | `openssl rand -base64 32`                  |
| `JWT_REFRESH_SECRET`      | `openssl rand -base64 32`                  |
| `CORS_ORIGINS`            | Your Vercel customer-web URL + admin URL (comma-separated) |
| `PUBLIC_URL`              | Your API public URL                        |
| `STRIPE_SECRET_KEY`       | From Stripe dashboard (test or live)       |
| `STRIPE_PUBLISHABLE_KEY`  | From Stripe dashboard                      |
| `STRIPE_WEBHOOK_SECRET`   | From Stripe webhook settings               |
| `STRIPE_CURRENCY`         | `sgd`                                      |
| `NODE_ENV`                | `production`                               |

## 4. Push schema and seed Neon DB

Run locally, pointing at Neon:

```bash
DATABASE_URL="<neon connection string>" npm run db:push
DATABASE_URL="<neon connection string>" npm run db:seed
```

Note the seeded outlet ID printed by `db:seed`.

## 5. Deploy customer-web to Vercel

1. Go to vercel.com → **New Project → Import Git Repository**
2. Set **Root Directory** to `customer-web`
3. Framework preset: **Next.js**
4. Add environment variables:

| Variable                            | Value                        |
| ----------------------------------- | ---------------------------- |
| `NEXT_PUBLIC_API_URL`               | Your API public URL (Railway/Render/etc) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`| From Stripe dashboard        |
| `NEXT_PUBLIC_DEFAULT_RESTAURANT_ID` | Outlet ID from db:seed       |

5. Deploy — Vercel builds `next build` automatically

## 6. Deploy admin-web to Vercel

1. **New Project → Import same repo**
2. Set **Root Directory** to `admin-web`
3. Framework preset: **Vite**
4. Add environment variable:

| Variable       | Value                |
| -------------- | -------------------- |
| `VITE_API_URL` | Your API public URL  |

5. Deploy

## 7. Update CORS on the API

After both frontends are deployed, add their Vercel URLs to `CORS_ORIGINS` on the API:

```
CORS_ORIGINS=https://your-customer-web.vercel.app,https://your-admin-web.vercel.app
```

Redeploy the API after updating this variable.

## 8. Test the Vercel deployment

- Customer app: `https://your-customer-web.vercel.app/table/<qrToken>`
- Admin: `https://your-admin-web.vercel.app/`
- API docs: `https://your-api-url/api/docs`

Use the same test flows as the local testing section above.

## Teardown (Vercel + Neon)

- **Vercel**: go to Project Settings → scroll to bottom → **Delete Project**
- **Neon**: go to Project Settings → **Delete Project** (deletes the database)
- **Stripe webhooks**: go to Stripe dashboard → Webhooks → delete the endpoint
