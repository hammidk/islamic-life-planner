import React, { useState } from 'react';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { Checklist } from './Checklist';
import { useApp } from '../contexts/AppContext';
import { prayerChecklistSuggestions } from '../data/taskValues';

interface PrayerRowProps {
  id: string;
  name: string;
  time: string;
  /** дополнительная подпись, например время восхода */
  hint?: string;
  isCurrent?: boolean;
}

/** Тихая строка намаза в хронологии дня: отметка, время, раскрываемые пункты */
export function PrayerRow({ id, name, time, hint, isCurrent = false }: PrayerRowProps) {
  const { prayersDone, togglePrayer, checklists } = useApp();
  const [open, setOpen] = useState(false);
  const done = Boolean(prayersDone[id]);
  const items = checklists[id] ?? [];
  const doneItems = items.filter((i) => i.done).length;

  return (
    <div className="py-2.5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => togglePrayer(id)}
          aria-pressed={done}
          aria-label={done ? `Снять отметку: ${name}` : `Отметить намаз: ${name}`}
          className={`flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-full border transition-colors duration-150 ease-out ${
          done ? 'border-primary/60 bg-primary/60' : 'border-[#CBD2C9] hover:border-primary'}`
          }>
          
          {done ? <CheckIcon className="h-3 w-3 text-white" strokeWidth={2.8} /> : null}
        </button>
        <p className="min-w-0 flex-1 truncate text-[13.5px]">
          <span
            className={`font-medium ${
            done ? 'text-muted' : isCurrent ? 'text-primary' : 'text-ink-soft'}`
            }>
            
            {name}
          </span>
          <span className="tabular-nums text-muted"> · {time}</span>
          {hint ? <span className="text-muted"> · {hint}</span> : null}
        </p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? `Скрыть пункты: ${name}` : `Показать пункты: ${name}`}
          className="flex shrink-0 items-center gap-1 rounded-full px-1.5 py-1 text-[12px] text-muted transition-colors duration-150 ease-out hover:bg-surface">
          
          {items.length > 0 ?
          <span className="tabular-nums">
              {doneItems}/{items.length}
            </span> :
          null}
          <ChevronDownIcon
            className={`h-4 w-4 transition-transform duration-200 ease-out ${open ? 'rotate-180' : ''}`}
            strokeWidth={1.8}
            aria-hidden="true" />
          
        </button>
      </div>
      {open ?
      <div className="mt-2 pl-[33px]">
          <Checklist targetId={id} suggestions={prayerChecklistSuggestions} />
        </div> :
      null}
    </div>);

}