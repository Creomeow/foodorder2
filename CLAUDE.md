# CLAUDE.md — Food Ordering System

Multi-tenant SaaS restaurant ordering platform. npm-workspaces monorepo with three apps + a shared package.

## Layout

- `api/` — Express + TypeScript + Prisma + Socket.IO + Stripe (the backend; single source of truth)
- `customer-web/` — Vite/React mobile-first customer ordering app
- `admin-web/` — Vite/React admin dashboard + Kitchen Display System (KDS)
- `shared/` — `@foodorder/shared`: Zod schemas, inferred types, enums, Socket.IO event names
- `nginx/` — reverse proxy for the containerised single-host deploy

## Commands

```bash
npm install                       # install all workspaces
npm run db:push                   # sync Prisma schema to DB (dev)
npm run db:seed                   # seed demo brand/outlets/menu/users
npm run dev:api | dev:customer | dev:admin
npm run typecheck                 # all workspaces (tsc --noEmit)
npm run build                     # build both frontends (vite)
docker compose up -d --build      # full stack behind nginx on :80
```

Run a single workspace script with `--workspace <name>` (e.g. `npm run db:studio --workspace api`).

## Architecture

- **Tenancy:** `Brand → Restaurant(outlet) → {categories, menu, tables, orders}`. Roles: `SUPER_ADMIN` (all), `MANAGER` (their brand), `STAFF` (their outlet).
- **Auth:** JWT access+refresh (`api/src/lib/jwt.ts`), bcrypt. Middleware in `api/src/middleware/` (`auth`, `validate`, `error`). Tenant scoping helpers in `api/src/lib/tenant.ts`.
- **API modules:** `api/src/modules/<domain>/` — each is `*.routes.ts` (+ `*.service.ts` for orders/coupons/reports). Mounted under `/api/v1` in `api/src/app.ts`.
- **Pricing:** computed server-side in `orders.service.ts` from the live menu — clients never send prices. `serialize()` (`lib/http.ts`) converts Decimal→number, Date→ISO at the boundary.
- **Realtime:** `api/src/realtime/io.ts` — rooms `outlet:{id}`, `session:{id}`, `kitchen:{id}`; events in `shared` `SocketEvent`. Frontends subscribe via `lib/socket.ts`.
- **Payments:** provider abstraction in `api/src/lib/payments/` (Stripe + Cash; HitPay/Xendit ready). Webhook is mounted with a raw-body parser in `app.ts` before `express.json()`.
- **Shared package:** imported as TS source via Vite/tsc path alias (`vite.config.ts` + `tsconfig.json paths`); no build step. API runs via `tsx` (dev and prod) so it transpiles the shared source too.

## Conventions / gotchas

- The API runs through **tsx** (no `tsc` emit) — `npm run build` only typechecks.
- Prisma enums and `@foodorder/shared` enums must stay in sync (both are string unions with identical values; cast at the Prisma boundary when TS complains).
- Frontends use a **relative** API URL (`NEXT_PUBLIC_API_URL=''` for customer-web, `VITE_API_URL=''` for admin-web) in Docker so nginx serves everything same-origin; set an absolute URL for local dev.
- `customer-web` is Next.js (App Router, `output: 'standalone'`); its Docker image runs `next start` via `node server.js` — no nginx inside that container, nginx only fronts it at the compose level.
- `admin-web` builds with `base=/admin/` for the nginx sub-path; `BrowserRouter` uses `import.meta.env.BASE_URL`.
- Env is loaded from the monorepo-root `.env` (api/`config/env.ts` + `prisma/seed.ts` resolve `../.env`); Prisma CLI scripts use `dotenv -e ../.env`.

## Verified

`npm run typecheck` (all), `npm run build` (both frontends), and a full API runtime smoke test (login → public menu → session → order with correct pricing → status update → dashboard → coupon → CSV export) all pass. RBAC (403/401) and Swagger (`/api/docs`) verified. Customer flow verified in-browser (QR → menu → item modal) on a mobile viewport.
