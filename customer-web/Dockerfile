# Build context = repo root (see docker-compose.yml).
FROM node:22-alpine AS build
WORKDIR /app
ARG VITE_API_URL=""
ARG VITE_STRIPE_PUBLISHABLE_KEY=""
ARG VITE_DEFAULT_RESTAURANT_ID=""
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY
ENV VITE_DEFAULT_RESTAURANT_ID=$VITE_DEFAULT_RESTAURANT_ID

COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY customer-web/package.json ./customer-web/
COPY api/package.json ./api/
COPY admin-web/package.json ./admin-web/
RUN npm ci --include-workspace-root --workspace customer-web --workspace shared

COPY shared ./shared
COPY customer-web ./customer-web
RUN npm run build --workspace customer-web

FROM nginx:alpine
COPY customer-web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/customer-web/dist /usr/share/nginx/html
EXPOSE 80
