import React, { useEffect, useState } from 'react';
import { MinusIcon, PlusIcon } from 'lucide-react';
import { BottomSheet } from '../BottomSheet';
import { SheetOption } from './SheetOption';
import { weekdayShort } from '../../utils/taskOptions';
import type { RepeatRule } from '../../types';

interface RepeatSheetProps {
  open: boolean;
  value?: RepeatRule;
  onSelect: (rule: RepeatRule) => void;
  onClose: () => void;
}

const isSimple = (rule: RepeatRule) =>
rule.kind === 'none' ||
rule.kind === 'daily' ||
rule.kind === 'monthly' ||
rule.kind === 'weeks' && rule.every === 1;

export function RepeatSheet({ open, value, onSelect, onClose }: RepeatSheetProps) {
  const current: RepeatRule = value ?? { kind: 'none' };
  const [advanced, setAdvanced] = useState(false);
  const [mode, setMode] = useState<'weekdays' | 'weeks'>('weekdays');
  const [days, setDays] = useState<number[]>([]);
  const [every, setEvery] = useState(2);

  useEffect(() => {
    if (!open) return;
    setAdvanced(!isSimple(current));
    setMode(current.kind === 'weeks' ? 'weeks' : 'weekdays');
    setDays(current.kind === 'weekdays' ? current.days : []);
    setEvery(current.kind === 'weeks' && current.every > 1 ? current.every : 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const choose = (rule: RepeatRule) => {
    onSelect(rule);
    onClose();
  };

  return (
    <BottomSheet open={open} title="Повтор" onClose={onClose}>
      <div className="-mx-3">
        <SheetOption
          label="Не повторять"
          selected={current.kind === 'none'}
          onClick={() => choose({ kind: 'none' })} />
        
        <SheetOption
          label="Каждый день"
          selected={current.kind === 'daily'}
          onClick={() => choose({ kind: 'daily' })} />
        
        <SheetOption
          label="Каждую неделю"
          selected={current.kind === 'weeks' && current.every === 1}
          onClick={() => choose({ kind: 'weeks', every: 1 })} />
        
        <SheetOption
          label="Каждый месяц"
          selected={current.kind === 'monthly'}
          onClick={() => choose({ kind: 'monthly' })} />
        
        <SheetOption
          label="Настроить…"
          selected={!isSimple(current)}
          onClick={() => setAdvanced((v) => !v)} />
        
      </div>

      {advanced ?
      <div className="mt-1 rounded-xl bg-canvas p-3">
          <div className="mb-3 flex gap-1.5">
            {(
          [
          { id: 'weekdays', label: 'Дни недели' },
          { id: 'weeks', label: 'Каждые N недель' }] as
          const).
          map((o) =>
          <button
            key={o.id}
            type="button"
            aria-pressed={mode === o.id}
            onClick={() => setMode(o.id)}
            className={`flex-1 rounded-lg border py-2 text-[13px] transition-colors duration-150 ease-out ${
            mode === o.id ?
            'border-primary/50 bg-primary-tint font-medium text-primary' :
            'border-line bg-surface text-ink-soft'}`
            }>
            
                {o.label}
              </button>
          )}
          </div>

          {mode === 'weekdays' ?
        <>
              <div className="grid grid-cols-7 gap-1.5">
                {weekdayShort.map((label, index) => {
              const on = days.includes(index);
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                  setDays((prev) => on ? prev.filter((d) => d !== index) : [...prev, index])
                  }
                  className={`rounded-lg border py-2 text-[13px] transition-colors duration-150 ease-out ${
                  on ?
                  'border-primary/50 bg-primary-tint font-medium text-primary' :
                  'border-line bg-surface text-ink-soft'}`
                  }>
                  
                      {label}
                    </button>);

            })}
              </div>
              <button
            type="button"
            disabled={days.length === 0}
            onClick={() => choose({ kind: 'weekdays', days })}
            className="mt-3 w-full rounded-xl bg-primary py-3 text-[14px] font-medium text-white disabled:opacity-40">
            
                Готово
              </button>
            </> :

        <div className="flex items-center gap-3">
              <div className="flex items-center rounded-xl border border-line bg-surface">
                <button
              type="button"
              aria-label="Меньше"
              onClick={() => setEvery((v) => Math.max(2, v - 1))}
              className="flex h-10 w-10 items-center justify-center text-ink-soft">
              
                  <MinusIcon className="h-4 w-4" strokeWidth={2} />
                </button>
                <span className="w-16 text-center text-[14.5px] tabular-nums text-ink">
                  {every} нед.
                </span>
                <button
              type="button"
              aria-label="Больше"
              onClick={() => setEvery((v) => Math.min(12, v + 1))}
              className="flex h-10 w-10 items-center justify-center text-ink-soft">
              
                  <PlusIcon className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
              <button
            type="button"
            onClick={() => choose({ kind: 'weeks', every })}
            className="flex-1 rounded-xl bg-primary py-3 text-[14px] font-medium text-white">
            
                Готово
              </button>
            </div>
        }
        </div> :
      null}
    </BottomSheet>);

}