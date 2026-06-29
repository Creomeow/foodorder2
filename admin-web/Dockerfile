# Build context = repo root (see docker-compose.yml).
FROM node:22-alpine AS build
WORKDIR /app
ARG VITE_API_URL=""
ARG VITE_BASE="/admin/"
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_BASE=$VITE_BASE

COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY admin-web/package.json ./admin-web/
COPY api/package.json ./api/
COPY customer-web/package.json ./customer-web/
RUN npm ci --include-workspace-root --workspace admin-web --workspace shared

COPY shared ./shared
COPY admin-web ./admin-web
RUN npm run build --workspace admin-web

FROM nginx:alpine
COPY admin-web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/admin-web/dist /usr/share/nginx/html
EXPOSE 80
