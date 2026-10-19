import React, { useState } from 'react';
import { BottomSheet } from '../BottomSheet';
import { SheetOption } from './SheetOption';
import { absoluteReminders, relativeReminders } from '../../utils/taskOptions';
import type { Reminder } from '../../types';

interface ReminderSheetProps {
  open: boolean;
  /** точное время задачи — определяет тип вариантов */
  time?: string;
  value?: Reminder;
  onSelect: (reminder: Reminder | undefined) => void;
  onClose: () => void;
}

export function ReminderSheet({ open, time, value, onSelect, onClose }: ReminderSheetProps) {
  const [custom, setCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const relative = Boolean(time);

  const close = () => {
    setCustom(false);
    setCustomValue('');
    onClose();
  };

  const choose = (reminder: Reminder | undefined) => {
    onSelect(reminder);
    close();
  };

  return (
    <BottomSheet open={open} title="Напоминание" onClose={close}>
      <p className="-mt-2 mb-2 text-[13px] text-muted">
        {relative ? `Относительно времени задачи · ${time}` : 'У задачи нет точного времени'}
      </p>
      <div className="-mx-3">
        {relative ?
        relativeReminders.map((r) =>
        <SheetOption
          key={r.minutes}
          label={r.label}
          selected={value?.kind === 'relative' && value.minutes === r.minutes}
          onClick={() => choose({ kind: 'relative', minutes: r.minutes })} />

        ) :
        absoluteReminders.map((r) =>
        <SheetOption
          key={r.time}
          label={r.label}
          hint={r.time}
          selected={value?.kind === 'absolute' && value.time === r.time}
          onClick={() => choose({ kind: 'absolute', time: r.time })} />

        )}
        <SheetOption label="Другое" onClick={() => setCustom(true)} />
        <SheetOption label="Без напоминания" selected={!value} onClick={() => choose(undefined)} />
      </div>

      {custom ?
      <div className="mt-2 flex items-center gap-2">
          {relative ?
        <input
          autoFocus
          inputMode="numeric"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value.replace(/\D/g, ''))}
          placeholder="За сколько минут"
          className="min-w-0 flex-1 rounded-xl border border-line bg-canvas px-3 py-3 text-[16px] text-ink focus:border-primary/50 focus:outline-none" /> :


        <input
          autoFocus
          type="time"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-line bg-canvas px-3 py-3 text-[16px] text-ink focus:border-primary/50 focus:outline-none"
          aria-label="Время напоминания" />

        }
          <button
          type="button"
          disabled={!customValue}
          onClick={() =>
          choose(
            relative ?
            { kind: 'relative', minutes: Number(customValue) } :
            { kind: 'absolute', time: customValue }
          )
          }
          className="shrink-0 rounded-xl bg-primary px-4 py-3 text-[14px] font-medium text-white disabled:opacity-40">
          
            Готово
          </button>
        </div> :
      null}
    </BottomSheet>);

}