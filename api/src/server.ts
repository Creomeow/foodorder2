import { createServer } from 'node:http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { createApp } from './app.js';
import { initRealtime } from './realtime/io.js';
import { prisma } from './lib/prisma.js';

async function main() {
  const app = createApp();
  const httpServer = createServer(app);
  initRealtime(httpServer);

  httpServer.listen(env.port, () => {
    logger.info(`API listening on ${env.apiUrl} (docs: ${env.apiUrl}/api/docs)`);
    if (!env.stripe.enabled) {
      logger.warn('Stripe not configured — card/PayNow/GrabPay payments disabled (cash only).');
    }
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    httpServer.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
