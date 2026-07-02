'use client';

import { useState } from 'react';
import { OrderType } from '@foodorder/shared';
import { useSession } from '../store/session';
import { Button } from './ui';

const TILES: { mode: OrderType | 'DELIVERY' | 'RETAIL'; label: string; icon: string; comingSoon?: boolean }[] = [
  { mode: OrderType.DINE_IN, label: 'Dine In', icon: '🍽️' },
  { mode: OrderType.TAKEAWAY, label: 'Take Away', icon: '🥡' },
  { mode: 'DELIVERY', label: 'Delivery', icon: '🚚', comingSoon: true },
  { mode: 'RETAIL', label: 'Retail', icon: '🛒', comingSoon: true },
];

export default function ServiceModeModal({ onClose }: { onClose: () => void }) {
  const session = useSession();
  const setServiceTime = useSession((s) => s.setServiceTime);
  const [time, setTime] = useState<'ASAP' | 'LATER'>(session.serviceTime);
  const [scheduled, setScheduled] = useState(session.scheduledFor ?? '');

  function confirm() {
    if (session.mode === OrderType.TAKEAWAY) {
      setServiceTime(time, time === 'LATER' ? scheduled || null : null);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-3xl bg-white px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">Service mode</h2>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {TILES.map((t) => {
            const active = !t.comingSoon && t.mode === session.mode;
            return (
              <div
                key={t.label}
                className={`relative rounded-2xl border p-4 text-center ${
                  t.comingSoon
                    ? 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-50'
                    : active
                      ? 'border-brand bg-brand-50'
                      : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="text-2xl">{t.icon}</div>
                <p className="mt-1 text-sm font-semibold">{t.label}</p>
                {t.comingSoon && (
                  <span className="mt-1 block text-[10px] font-semibold uppercase text-gray-400">
                    Coming soon
                  </span>
                )}
                {active && (
                  <span className="mt-1 block text-[10px] font-semibold uppercase text-brand-700">
                    Selected
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {session.mode === OrderType.TAKEAWAY && (
          <div className="mt-5">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">When would you like it?</h3>
            <div className="space-y-2">
              <label
                className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-sm ${
                  time === 'ASAP' ? 'border-brand bg-brand-50' : 'border-gray-200'
                }`}
              >
                <span className="font-medium">Today ASAP</span>
                <input
                  type="radio"
                  checked={time === 'ASAP'}
                  onChange={() => setTime('ASAP')}
                  className="accent-brand"
                />
              </label>
              <label
                className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-sm ${
                  time === 'LATER' ? 'border-brand bg-brand-50' : 'border-gray-200'
                }`}
              >
                <span className="font-medium">Later</span>
                <input
                  type="radio"
                  checked={time === 'LATER'}
                  onChange={() => setTime('LATER')}
                  className="accent-brand"
                />
              </label>
              {time === 'LATER' && (
                <input
                  type="datetime-local"
                  value={scheduled}
                  onChange={(e) => setScheduled(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand focus:outline-none"
                />
              )}
            </div>
          </div>
        )}

        <Button className="mt-5 w-full" onClick={confirm}>
          Confirm
        </Button>
      </div>
    </div>
  );
}
