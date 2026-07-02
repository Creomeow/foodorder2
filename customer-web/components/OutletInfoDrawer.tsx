'use client';

import type { Restaurant } from '@foodorder/shared';

const DAY_LABEL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface OperatingHourRow {
  day: number;
  open: string;
  close: string;
  closed: boolean;
}

export default function OutletInfoDrawer({
  restaurant,
  onClose,
}: {
  restaurant: Restaurant;
  onClose: () => void;
}) {
  const hours = (restaurant.operatingHours as OperatingHourRow[] | null) ?? [];
  const byDay = new Map(hours.map((h) => [h.day, h]));

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-3xl bg-white px-5 py-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{restaurant.name}</h2>
          <button onClick={onClose} className="text-sm text-gray-400">
            Close
          </button>
        </div>

        <div className="mt-5 overflow-y-auto">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">Operating Hours</h3>
          <div className="space-y-1.5 text-sm">
            {DAY_LABEL.map((label, day) => {
              const row = byDay.get(day);
              return (
                <div key={day} className="flex items-center justify-between">
                  <span className="text-gray-600">{label}</span>
                  <span className={row?.closed ? 'text-gray-400' : 'font-medium text-gray-800'}>
                    {!row ? '—' : row.closed ? 'Closed' : `${row.open} - ${row.close}`}
                  </span>
                </div>
              );
            })}
          </div>

          {restaurant.phone && (
            <div className="mt-5">
              <h3 className="mb-1 text-sm font-semibold text-gray-700">Contact Number</h3>
              <p className="text-sm text-gray-600">{restaurant.phone}</p>
            </div>
          )}

          {restaurant.address && (
            <div className="mt-5">
              <h3 className="mb-1 text-sm font-semibold text-gray-700">Address</h3>
              <p className="text-sm text-gray-600">{restaurant.address}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
