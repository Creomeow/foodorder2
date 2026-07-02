FROM node:22-slim AS deps
WORKDIR /app
# Install libssl3 before npm ci so Prisma's postinstall detects OpenSSL 3.x
# and downloads the debian-openssl-3.0.x engine binary (not linux-musl).
RUN apt-get update -qy && apt-get install -qy --no-install-recommends libssl3 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY api/package.json ./api/
COPY customer-web/package.json ./customer-web/
COPY admin-web/package.json ./admin-web/
RUN npm ci --include-workspace-root --workspace api --workspace shared

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# libssl3 is needed both for prisma generate (during build) and at runtime.
RUN apt-get update -qy && apt-get install -qy --no-install-recommends libssl3 && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY shared ./shared
COPY api ./api
RUN npm run db:generate --workspace api

WORKDIR /app/api
EXPOSE 4000
# Apply migrations (or push schema), seed if empty-safe, then start.
CMD ["npx", "tsx", "src/server.ts"]
