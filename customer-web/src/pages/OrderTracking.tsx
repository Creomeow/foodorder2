import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ORDER_STATUS_FLOW, OrderStatus, type Order } from '@foodorder/shared';
import { api } from '../lib/api';
import { trackOrder } from '../lib/socket';
import { Spinner, Button } from '../components/ui';
import { money } from '../lib/format';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Order received',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY: 'Ready',
  SERVED: 'Served',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export default function OrderTracking() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ['order', orderId],
    enabled: !!orderId,
    queryFn: async () => (await api.get(`/public/orders/${orderId}`)).data,
    refetchInterval: 15000, // fallback poll; socket gives instant updates
  });

  useEffect(() => {
    if (!orderId) return;
    return trackOrder(orderId, (updated) => {
      qc.setQueryData(['order', orderId], updated as Order);
    });
  }, [orderId, qc]);

  if (isLoading || !order) return <Spinner label="Loading order…" />;

  const cancelled = order.status === OrderStatus.CANCELLED;
  const currentIdx = ORDER_STATUS_FLOW.indexOf(order.status);

  return (
    <div className="flex min-h-screen flex-col px-4 py-6">
      <div className="text-center">
        <p className="text-sm text-gray-400">Order</p>
        <h1 className="text-3xl font-extrabold tracking-tight">#{order.orderNumber}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {order.orderType === 'DINE_IN' ? `Table ${order.tableNumber ?? ''}` : 'Takeaway'}
        </p>
      </div>

      {/* Status stepper */}
      <div className="mt-8">
        {cancelled ? (
          <div className="rounded-2xl bg-red-50 p-4 text-center text-sm font-semibold text-red-600">
            This order was cancelled.
          </div>
        ) : (
          <div className="space-y-3">
            {ORDER_STATUS_FLOW.slice(0, 5).map((status, i) => {
              const done = i <= currentIdx;
              const active = i === currentIdx;
              return (
                <div key={status} className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                      done ? 'bg-brand text-white' : 'bg-gray-100 text-gray-400'
                    } ${active ? 'ring-4 ring-brand-100' : ''}`}
                  >
                    {done ? '✓' : i + 1}
                  </div>
                  <span className={`text-sm ${done ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>
                    {STATUS_LABEL[status]}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="mt-8 rounded-2xl border border-gray-100 p-4">
        <h2 className="mb-2 text-sm font-semibold">Items</h2>
        <div className="space-y-2">
          {order.items.map((it) => (
            <div key={it.id} className="flex justify-between text-sm">
              <span>
                {it.quantity}× {it.name}
                {it.modifiers.length > 0 && (
                  <span className="block text-xs text-gray-400">
                    {it.modifiers.map((m) => m.name).join(', ')}
                  </span>
                )}
              </span>
              <span>{money(Number(it.unitPrice) * it.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-gray-100 pt-3 text-sm">
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>{money(Number(order.total))}</span>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-8">
        <Button variant="outline" className="w-full" onClick={() => navigate('/menu')}>
          Order more
        </Button>
      </div>
    </div>
  );
}
