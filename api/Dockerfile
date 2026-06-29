# Build context = repo root (see docker-compose.yml).
FROM node:22-alpine AS deps
WORKDIR /app
# Manifests for all workspaces so npm can resolve the workspace graph.
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY api/package.json ./api/
COPY customer-web/package.json ./customer-web/
COPY admin-web/package.json ./admin-web/
# Install only the API + shared workspaces (skips frontend deps).
RUN npm ci --include-workspace-root --workspace api --workspace shared

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY shared ./shared
COPY api ./api
# Generate the Prisma client for the runtime platform.
RUN npm run db:generate --workspace api

WORKDIR /app/api
EXPOSE 4000
# Apply migrations (or push schema), seed if empty-safe, then start.
CMD ["sh", "-c", "npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss; npx tsx src/server.ts"]
