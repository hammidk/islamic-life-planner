import { useEffect, useRef, useState } from 'react';
import { CheckIcon, ChevronDownIcon, PlusIcon } from 'lucide-react';
import { DayTaskList } from './DayTaskList';
import { InlineCreate } from './task/InlineCreate';
import { useApp } from '../contexts/AppContext';
import { useQuickAdd } from '../contexts/QuickAddContext';
import { prayerChecklistSuggestions } from '../data/taskValues';
import { isPrayerId } from '../data/appData';
import { isDoneOn, isOpenOn, occursOn } from '../utils/occurrence';
import { compareOrder } from '../utils/taskOptions';

interface PrayerRowProps {
  id: string;
  name: string;
  time: string;
  /** день расписания, YYYY-MM-DD — задачи блока и отметки вхождений относятся к нему */
  day: string;
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
 * Внутри — задачи этого намаза (prayerId) на этот день: создаются той же карточкой и рисуются
 * той же строкой, что и обычные дела, в оформлении variant="prayer" (как прежние пункты).
 */
export function PrayerRow({ id, name, time, day, hint, isCurrent = false, isLate = false }: PrayerRowProps) {
  const { togglePrayer, tasks, addTask } = useApp();
  const { openInline } = useQuickAdd();
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const prayerId = isPrayerId(id) ? id : null;
  const slot = `prayer:${id}`;

  /** все задачи блока, которые есть в этот день; в списке — ещё не выполненные */
  const dayTasks = prayerId ? tasks.filter((t) => t.prayerId === prayerId && occursOn(t, day)) : [];
  const openTasks = dayTasks.filter((t) => isOpenOn(t, day)).sort(compareOrder);
  const doneCount = dayTasks.filter((t) => isDoneOn(t, day)).length;
  const suggestions = prayerChecklistSuggestions.filter(
    (s) => !dayTasks.some((t) => t.title.toLowerCase() === s.toLowerCase())
  );

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
          {/* сначала время, затем название: «06:18 Фаджр», у Тахаджуда «03:24 — 04:45 Тахаджуд» */}
          <span className="tabular-nums text-white/85">{time}</span>{' '}
          <span className="font-semibold">{name}</span>
          {hint ? <span className="text-[12.5px] text-white/70"> · {hint}</span> : null}
        </p>
        {isCurrent ?
        <span className="shrink-0 text-[12px] font-medium text-white/85">Сейчас</span> :
        null}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? `Скрыть дела: ${name}` : `Показать дела: ${name}`}
          className="flex shrink-0 items-center gap-1 rounded-full px-1.5 py-1 text-[12px] text-white/85 transition-colors duration-150 ease-out hover:bg-white/10">

          {dayTasks.length > 0 ?
          <span className="tabular-nums">
              {doneCount}/{dayTasks.length}
            </span> :
          null}
          <ChevronDownIcon
            className={`h-4 w-4 transition-transform duration-200 ease-out ${open ? 'rotate-180' : ''}`}
            strokeWidth={1.8}
            aria-hidden="true" />

        </button>
      </div>
      {open && prayerId ?
      // как прежние пункты: без подложки, в цвет блока; логика — общая с задачами
      <div className="mt-2 pl-[34px]">
          <InlineCreate slot={slot} variant="prayer" />
          {openTasks.length > 0 ?
        <DayTaskList
          tasks={openTasks}
          divider="divide-transparent"
          // строки цвета блока: под ними слои действий свайпа, а блок остаётся сплошным
          surface={isLate ? 'bg-[#B4443A]' : 'bg-primary'}
          showDate={false}
          day={day}
          variant="prayer"
          hidePrayer
          hideDone /> :
        null}
          {suggestions.length > 0 ?
        <div className="flex flex-wrap gap-1.5 pb-1 pt-1">
              {suggestions.map((s) =>
          <button
            key={s}
            type="button"
            // подсказка создаёт настоящую задачу блока, как карточка
            onClick={() => addTask({ title: s, prayerId, sphere: 'faith', date: day })}
            className="rounded-full border border-white/40 px-2.5 py-1 text-[12.5px] text-white transition-colors duration-150 ease-out hover:bg-white/10">
            
                  + {s}
                </button>
          )}
            </div> :
        null}
          <button
          type="button"
          onClick={() => openInline({ prayerId, sphere: 'faith', date: day }, slot)}
          className="flex min-h-[44px] items-center gap-1 text-[13px] font-medium text-white/90">

            <PlusIcon className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
            добавить пункт
          </button>
        </div> :
      null}
    </div>);

}
