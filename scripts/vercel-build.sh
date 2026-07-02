#!/bin/bash
# Vercel build script for customer-web static export.
# Generates the Vercel Build Output API v3 structure directly so Vercel
# skips framework detection and deploys as a pure static site (0 functions).
set -e

npm run build --workspace customer-web

mkdir -p .vercel/output/static
cp -r customer-web/out/. .vercel/output/static/

node -e "
const routes = [
  { src: '^/order/[^/]+\$', dest: '/order/_.html' },
  { src: '^/pay/[^/]+\$',   dest: '/pay/_.html'   },
  { src: '^/table/[^/]+\$', dest: '/table/_.html'  }
];
require('fs').writeFileSync(
  '.vercel/output/config.json',
  JSON.stringify({ version: 3, routes }, null, 2)
);
console.log('Vercel Build Output API v3 written — 0 serverless functions.');
"
