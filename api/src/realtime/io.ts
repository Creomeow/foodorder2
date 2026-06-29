import type { Server as HttpServer } from 'node:http';
import { Server as SocketServer, type Socket } from 'socket.io';
import { SocketEvent } from '@foodorder/shared';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { verifyAccessToken } from '../lib/jwt.js';

let io: SocketServer | null = null;

export function initRealtime(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: env.corsOrigins, credentials: true },
  });

  io.on('connection', (socket: Socket) => {
    logger.debug({ id: socket.id }, 'socket connected');

    // Customers track a single order (public, no auth).
    socket.on(SocketEvent.JOIN_ORDER, (orderId: string) => {
      if (typeof orderId === 'string') socket.join(`order:${orderId}`);
    });

    // Staff join an outlet room (requires valid token).
    socket.on(SocketEvent.JOIN_OUTLET, (payload: { token?: string; restaurantId?: string }) => {
      try {
        if (!payload?.token || !payload?.restaurantId) return;
        verifyAccessToken(payload.token);
        socket.join(`outlet:${payload.restaurantId}`);
      } catch {
        /* ignore unauthorized join */
      }
    });

    // Kitchen display joins the kitchen room for an outlet.
    socket.on(SocketEvent.JOIN_KITCHEN, (payload: { token?: string; restaurantId?: string }) => {
      try {
        if (!payload?.token || !payload?.restaurantId) return;
        verifyAccessToken(payload.token);
        socket.join(`kitchen:${payload.restaurantId}`);
      } catch {
        /* ignore */
      }
    });

    socket.on('disconnect', () => logger.debug({ id: socket.id }, 'socket disconnected'));
  });

  return io;
}

function emit(room: string, event: string, payload: unknown) {
  io?.to(room).emit(event, payload);
}

/** Broadcast a brand-new order to the outlet + kitchen rooms. */
export function emitOrderNew(restaurantId: string, order: unknown) {
  emit(`outlet:${restaurantId}`, SocketEvent.ORDER_NEW, order);
  emit(`kitchen:${restaurantId}`, SocketEvent.KDS_QUEUE, order);
}

/** Broadcast a status change to the order, outlet and kitchen rooms. */
export function emitOrderStatus(restaurantId: string, order: { id: string }) {
  emit(`order:${order.id}`, SocketEvent.ORDER_STATUS, order);
  emit(`outlet:${restaurantId}`, SocketEvent.ORDER_UPDATED, order);
  emit(`kitchen:${restaurantId}`, SocketEvent.KDS_QUEUE, order);
}
