import { useEffect, useRef, useState } from 'react';
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
  /** время намаза почти вышло, а он не отмечен */
  isLate?: boolean;
}

/** пауза, чтобы отметка была видна перед исчезновением блока */
const HIDE_DELAY = 450;

/**
 * Намаз в хронологии дня: сплошной блок от края до края экрана (компенсирует отступ Shell).
 * Отмеченный намаз исчезает из списка — отметка остаётся в prayersDone.
 */
export function PrayerRow({ id, name, time, hint, isCurrent = false, isLate = false }: PrayerRowProps) {
  const { togglePrayer, checklists } = useApp();
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const items = checklists[id] ?? [];
  const doneItems = items.filter((i) => i.done).length;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const mark = () => {
    if (marking) return;
    setMarking(true);
    timer.current = window.setTimeout(() => togglePrayer(id), HIDE_DELAY);
  };

  return (
    <div
      className={`-mx-5 px-5 py-3 text-white transition-colors duration-150 ease-out ${
      isLate ? 'bg-[#B4443A]' : 'bg-primary'}`
      }>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={mark}
          aria-pressed={marking}
          aria-label={`Отметить намаз: ${name}`}
          className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border transition-colors duration-150 ease-out ${
          marking ? 'border-white bg-white' : 'border-white/70 hover:border-white'}`
          }>

          {marking ?
          <CheckIcon
            className={`h-3 w-3 ${isLate ? 'text-[#B4443A]' : 'text-primary'}`}
            strokeWidth={2.8} /> :

          null}
        </button>
        <p className="min-w-0 flex-1 truncate text-[15px]">
          <span className="font-semibold">{name}</span>
          <span className="tabular-nums text-white/85"> · {time}</span>
          {hint ? <span className="text-[12.5px] text-white/70"> · {hint}</span> : null}
        </p>
        {isCurrent ?
        <span className="shrink-0 text-[12px] font-medium text-white/85">Сейчас</span> :
        null}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? `Скрыть пункты: ${name}` : `Показать пункты: ${name}`}
          className="flex shrink-0 items-center gap-1 rounded-full px-1.5 py-1 text-[12px] text-white/85 transition-colors duration-150 ease-out hover:bg-white/10">

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
      <div className="mt-2 pl-[34px]">
          <Checklist targetId={id} suggestions={prayerChecklistSuggestions} tone="onPrimary" />
        </div> :
      null}
    </div>);

}
