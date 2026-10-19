import React, { useEffect, useState } from 'react';
import { BottomSheet } from '../BottomSheet';
import { SheetOption } from './SheetOption';

interface DurationSheetProps {
  open: boolean;
  /** минуты строкой; '' — не указана */
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

const presets = [5, 15, 30, 60];

export function DurationSheet({ open, value, onSelect, onClose }: DurationSheetProps) {
  const isPreset = presets.some((p) => String(p) === value);
  const [custom, setCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');

  useEffect(() => {
    if (!open) return;
    setCustom(Boolean(value) && !isPreset);
    setCustomValue(value && !isPreset ? value : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const choose = (v: string) => {
    onSelect(v);
    onClose();
  };

  const saveCustom = () => {
    const n = Math.round(Number(customValue));
    if (Number.isFinite(n) && n > 0) choose(String(Math.min(n, 24 * 60)));
  };

  return (
    <BottomSheet open={open} title="Длительность" onClose={onClose}>
      <div className="-mx-3">
        {presets.map((p) =>
        <SheetOption
          key={p}
          label={`${p} мин`}
          selected={value === String(p)}
          onClick={() => choose(String(p))} />

        )}
        <SheetOption label="Своя…" selected={custom} onClick={() => setCustom(true)} />
        {custom ?
        <div className="flex items-center gap-2 px-3 pb-2">
            <input
            autoFocus
            type="number"
            inputMode="numeric"
            min={1}
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveCustom()}
            placeholder="Минут"
            aria-label="Своя длительность в минутах"
            className="min-w-0 flex-1 rounded-xl border border-line bg-canvas px-3 py-2.5 text-[15px] text-ink focus:border-primary/50 focus:outline-none" />
          
            <button
            type="button"
            onClick={saveCustom}
            disabled={!(Number(customValue) > 0)}
            className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-[14px] font-medium text-white disabled:opacity-40">
            
              Готово
            </button>
          </div> :
        null}
        <SheetOption label="Не указана" selected={!value} onClick={() => choose('')} />
      </div>
    </BottomSheet>);

}