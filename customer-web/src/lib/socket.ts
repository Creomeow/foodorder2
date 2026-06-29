import { io, type Socket } from 'socket.io-client';
import { SocketEvent } from '@foodorder/shared';
import { API_URL } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, { transports: ['websocket', 'polling'] });
  }
  return socket;
}

/** Subscribe to live status updates for a single order. */
export function trackOrder(orderId: string, onUpdate: (order: unknown) => void): () => void {
  const s = getSocket();
  const join = () => s.emit(SocketEvent.JOIN_ORDER, orderId);
  join();
  s.on('connect', join);
  s.on(SocketEvent.ORDER_STATUS, onUpdate);
  return () => {
    s.off('connect', join);
    s.off(SocketEvent.ORDER_STATUS, onUpdate);
  };
}
