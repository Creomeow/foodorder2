import { useMemo, useState } from 'react';
import type { MenuItem, ModifierGroup, ModifierOption } from '@foodorder/shared';
import { Button } from './ui';
import { money } from '../lib/format';
import { useCart } from '../store/cart';

export default function ItemModal({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const addItem = useCart((s) => s.addItem);
  const groups = item.modifierGroups ?? [];

  // Pre-select defaults for each group.
  const [selected, setSelected] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    for (const g of groups) {
      init[g.id] = g.options.filter((o) => o.isDefault).map((o) => o.id);
    }
    return init;
  });
  const [notes, setNotes] = useState('');
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);

  function toggle(group: ModifierGroup, option: ModifierOption) {
    setSelected((prev) => {
      const current = prev[group.id] ?? [];
      if (group.multiple) {
        const next = current.includes(option.id)
          ? current.filter((id) => id !== option.id)
          : [...current, option.id];
        return { ...prev, [group.id]: next };
      }
      return { ...prev, [group.id]: [option.id] };
    });
  }

  const chosenOptions = useMemo<ModifierOption[]>(() => {
    const all = groups.flatMap((g) => g.options);
    const ids = Object.values(selected).flat();
    return all.filter((o) => ids.includes(o.id));
  }, [groups, selected]);

  const unit = Number(item.price) + chosenOptions.reduce((s, o) => s + Number(o.price), 0);

  function add() {
    for (const g of groups) {
      const count = (selected[g.id] ?? []).length;
      if (g.required && count < Math.max(1, g.minSelect)) {
        setError(`Please choose ${g.name}`);
        return;
      }
      if (g.multiple && g.maxSelect > 0 && count > g.maxSelect) {
        setError(`Choose up to ${g.maxSelect} for ${g.name}`);
        return;
      }
    }
    addItem(item, chosenOptions, notes, qty);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {item.imageUrl && (
          <img src={item.imageUrl} alt={item.name} className="h-44 w-full rounded-t-3xl object-cover" />
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <h2 className="text-lg font-bold">{item.name}</h2>
          {item.description && <p className="mt-1 text-sm text-gray-500">{item.description}</p>}

          {groups.map((g) => (
            <div key={g.id} className="mt-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{g.name}</h3>
                <span className="text-[11px] text-gray-400">
                  {g.required ? 'Required' : 'Optional'}
                  {g.multiple ? ` · up to ${g.maxSelect}` : ''}
                </span>
              </div>
              <div className="mt-2 space-y-1.5">
                {g.options.map((o) => {
                  const checked = (selected[g.id] ?? []).includes(o.id);
                  return (
                    <label
                      key={o.id}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2.5 ${
                        checked ? 'border-brand bg-brand-50' : 'border-gray-200'
                      }`}
                    >
                      <span className="flex items-center gap-2 text-sm">
                        <input
                          type={g.multiple ? 'checkbox' : 'radio'}
                          checked={checked}
                          onChange={() => toggle(g, o)}
                          className="accent-brand"
                        />
                        {o.name}
                      </span>
                      {Number(o.price) > 0 && (
                        <span className="text-xs text-gray-500">+{money(Number(o.price))}</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="mt-5">
            <h3 className="text-sm font-semibold">Special request</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. less spicy, no onion"
              className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              rows={2}
            />
          </div>

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </div>

        <div className="flex items-center gap-3 border-t border-gray-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center rounded-xl border border-gray-200">
            <button className="px-3 py-2 text-lg" onClick={() => setQty((q) => Math.max(1, q - 1))}>
              −
            </button>
            <span className="w-8 text-center text-sm font-semibold">{qty}</span>
            <button className="px-3 py-2 text-lg" onClick={() => setQty((q) => q + 1)}>
              +
            </button>
          </div>
          <Button className="flex-1" onClick={add}>
            Add · {money(unit * qty)}
          </Button>
        </div>
      </div>
    </div>
  );
}
