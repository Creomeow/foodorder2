import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Alias the shared package to its TS source so Vite transpiles it directly
// (no separate build step for @foodorder/shared).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@foodorder/shared': resolve(__dirname, '../shared/src/index.ts'),
      '@': resolve(__dirname, 'src'),
    },
  },
  server: { port: 5173, host: true },
});
