import { io, type Socket } from 'socket.io-client';
import { SocketEvent } from '@foodorder/shared';
import { API_URL } from './api';
import { useAuth } from '../store/auth';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) socket = io(API_URL, { transports: ['websocket', 'polling'] });
  return socket;
}

/** Join the outlet + kitchen rooms and react to order events. */
export function subscribeOutlet(
  restaurantId: string,
  handlers: { onNew?: (o: unknown) => void; onUpdated?: (o: unknown) => void; onKds?: (o: unknown) => void },
): () => void {
  const s = getSocket();
  const token = useAuth.getState().accessToken ?? '';
  const join = () => {
    s.emit(SocketEvent.JOIN_OUTLET, { token, restaurantId });
    s.emit(SocketEvent.JOIN_KITCHEN, { token, restaurantId });
  };
  join();
  s.on('connect', join);
  if (handlers.onNew) s.on(SocketEvent.ORDER_NEW, handlers.onNew);
  if (handlers.onUpdated) s.on(SocketEvent.ORDER_UPDATED, handlers.onUpdated);
  if (handlers.onKds) s.on(SocketEvent.KDS_QUEUE, handlers.onKds);

  return () => {
    s.off('connect', join);
    if (handlers.onNew) s.off(SocketEvent.ORDER_NEW, handlers.onNew);
    if (handlers.onUpdated) s.off(SocketEvent.ORDER_UPDATED, handlers.onUpdated);
    if (handlers.onKds) s.off(SocketEvent.KDS_QUEUE, handlers.onKds);
  };
}
