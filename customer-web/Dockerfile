# Build context = repo root (see docker-compose.yml).
FROM node:22-alpine AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=""
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""
ARG NEXT_PUBLIC_DEFAULT_RESTAURANT_ID=""
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_DEFAULT_RESTAURANT_ID=$NEXT_PUBLIC_DEFAULT_RESTAURANT_ID
ENV NEXT_STANDALONE=true

COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY customer-web/package.json ./customer-web/
COPY api/package.json ./api/
COPY admin-web/package.json ./admin-web/
RUN npm ci --include-workspace-root --workspace customer-web --workspace shared

COPY shared ./shared
COPY customer-web ./customer-web
RUN npm run build --workspace customer-web

# Next.js standalone output bundles its own minimal node_modules — no nginx needed.
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/customer-web/.next/standalone ./
COPY --from=build /app/customer-web/.next/static ./customer-web/.next/static
COPY --from=build /app/customer-web/public ./customer-web/public
EXPOSE 5173
ENV PORT=5173
CMD ["node", "customer-web/server.js"]
