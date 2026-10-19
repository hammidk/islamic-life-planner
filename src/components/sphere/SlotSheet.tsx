import { useEffect, useState } from 'react';
import { BottomSheet } from '../BottomSheet';
import type { SphereSlot } from '../../types';

interface SlotSheetProps {
  open: boolean;
  slot?: SphereSlot;
  onSave: (slot: SphereSlot | null) => void;
  onClose: () => void;
}

const presets = [15, 30, 60, 120];
const DEFAULT_START = '10:00';
const DEFAULT_DURATION = 60;

/** Время сферы в ежедневном расписании: начало и длительность */
export function SlotSheet({ open, slot, onSave, onClose }: SlotSheetProps) {
  const [start, setStart] = useState(DEFAULT_START);
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [custom, setCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');

  useEffect(() => {
    if (!open) return;
    const value = slot?.duration ?? DEFAULT_DURATION;
    setStart(slot?.start ?? DEFAULT_START);
    setDuration(value);
    setCustom(!presets.includes(value));
    setCustomValue(presets.includes(value) ? '' : String(value));
  }, [open, slot]);

  const customMinutes = Math.round(Number(customValue));
  const minutes = custom ? customMinutes : duration;
  const valid = /^\d{2}:\d{2}$/.test(start) && Number.isFinite(minutes) && minutes > 0;

  const chip = (active: boolean) =>
  `rounded-full border px-3 py-1.5 text-[13.5px] transition-colors duration-150 ease-out ${
  active ? 'border-primary/40 bg-primary-tint text-primary' : 'border-line text-ink-soft hover:bg-canvas'}`;

  return (
    <BottomSheet open={open} title="Время в расписании" onClose={onClose}>
      <div className="flex items-center gap-3 rounded-xl border border-line bg-canvas px-3 py-2.5">
        <label htmlFor="slot-start" className="flex-1 text-[15px] text-ink">
          Начало
        </label>
        <input
          id="slot-start"
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="bg-transparent text-right text-[14.5px] text-ink-soft focus:outline-none" />

      </div>

      <p className="mb-2 mt-4 text-[13px] text-muted">Длительность</p>
      <div className="flex flex-wrap gap-2">
        {presets.map((p) =>
        <button
          key={p}
          type="button"
          onClick={() => {
            setCustom(false);
            setDuration(p);
          }}
          aria-pressed={!custom && duration === p}
          className={chip(!custom && duration === p)}>

            {p} мин
          </button>
        )}
        <button type="button" onClick={() => setCustom(true)} aria-pressed={custom} className={chip(custom)}>
          Своя
        </button>
      </div>
      {custom ?
      <input
        autoFocus
        type="number"
        inputMode="numeric"
        min={1}
        value={customValue}
        onChange={(e) => setCustomValue(e.target.value)}
        placeholder="Минут"
        aria-label="Своя длительность в минутах"
        className="mt-3 w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-[15px] text-ink focus:border-primary/50 focus:outline-none" /> :

      null}

      <div className="mt-5 flex items-center gap-3">
        {slot ?
        <button
          type="button"
          onClick={() => {
            onSave(null);
            onClose();
          }}
          className="rounded-xl px-4 py-2.5 text-[14px] text-muted transition-colors duration-150 ease-out hover:text-ink">

            Убрать
          </button> :
        null}
        <button
          type="button"
          disabled={!valid}
          onClick={() => {
            onSave({ start, duration: Math.min(minutes, 24 * 60) });
            onClose();
          }}
          className="ml-auto rounded-xl bg-primary px-5 py-2.5 text-[14px] font-medium text-white disabled:opacity-40">

          Сохранить
        </button>
      </div>
    </BottomSheet>);

}
