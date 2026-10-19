import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Shell } from '../components/Shell';
import { ProfileButton } from '../components/ProfileButton';
import { SegmentedControl } from '../components/SegmentedControl';
import { useApp } from '../contexts/AppContext';
import { useLive } from '../contexts/LiveDataContext';
import { getMonthGrid, getWeekDays } from '../utils/calendar';
import { weekdayShort } from '../utils/taskOptions';

type CalendarView = 'week' | 'month';
const VIEW_KEY = 'sirahdo.calendarView';

const loadView = (): CalendarView => {
  try {
    return localStorage.getItem(VIEW_KEY) === 'month' ? 'month' : 'week';
  } catch {
    return 'week';
  }
};

const tasksWord = (n: number) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'дело';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дела';
  return 'дел';
};

function StepButton({ dir, onClick, label }: {dir: 'prev' | 'next';onClick: () => void;label: string;}) {
  const Icon = dir === 'prev' ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors duration-150 ease-out hover:bg-line/60">
      
      <Icon className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
    </button>);

}

/** Экран «Календарь»: неделя списком или месяц сеткой */
export function WeekTasks() {
  const navigate = useNavigate();
  const { tasks } = useApp();
  // подписка на живую дату: календарь пересчитывается после полуночи
  useLive();

  const [view, setViewState] = useState<CalendarView>(loadView);
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  const setView = (next: CalendarView) => {
    setViewState(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {

      /* без хранилища выбор просто не запомнится */}
  };

  const active = tasks.filter((t) => t.status !== 'cancelled' && t.date);
  const countFor = (date: string) => active.filter((t) => t.date === date).length;

  const week = getWeekDays(weekOffset);
  const month = getMonthGrid(monthOffset);
  const weekTitle =
  week.length > 0 ? `${week[0].label} — ${week[week.length - 1].label}` : '';

  return (
    <Shell nav>
      <header className="flex items-center justify-between gap-3 pb-4 pt-3">
        <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.015em] text-ink">
          Календарь
        </h1>
        <ProfileButton />
      </header>

      <SegmentedControl
        label="Вид календаря"
        options={[
        { id: 'week', label: 'Неделя' },
        { id: 'month', label: 'Месяц' }]
        }
        value={view}
        onChange={setView} />
      

      {view === 'week' ?
      <section aria-label="Неделя" className="mt-4">
          <div className="mb-1 flex items-center justify-between">
            <StepButton dir="prev" label="Предыдущая неделя" onClick={() => setWeekOffset((v) => v - 1)} />
            <button
            type="button"
            onClick={() => setWeekOffset(0)}
            className={`text-[13.5px] ${weekOffset === 0 ? 'text-muted' : 'font-medium text-primary'}`}>
            
              {weekOffset === 0 ? 'Эта неделя' : weekTitle}
            </button>
            <StepButton dir="next" label="Следующая неделя" onClick={() => setWeekOffset((v) => v + 1)} />
          </div>
          <ul className="divide-y divide-line">
            {week.map((day) => {
            const count = countFor(day.date);
            return (
              <li key={day.date}>
                  <button
                  type="button"
                  onClick={() => navigate(`/day/${day.date}`)}
                  className="flex w-full items-center gap-3 px-1 py-3.5 text-left">
                  
                    <span
                    className={`w-7 shrink-0 text-[13px] ${
                    day.isToday ? 'font-semibold text-primary' : 'text-muted'}`
                    }>
                    
                      {day.weekdayShort}
                    </span>
                    <span
                    className={`min-w-0 flex-1 truncate text-[15px] ${
                    day.isToday ? 'font-medium text-primary' : 'text-ink'}`
                    }>
                    
                      {day.label}
                      {day.isToday ? ' · сегодня' : ''}
                    </span>
                    <span className="shrink-0 text-[13px] tabular-nums text-muted">
                      {count > 0 ? `${count} ${tasksWord(count)}` : ''}
                    </span>
                    <ChevronRightIcon
                    className="h-4 w-4 shrink-0 text-muted"
                    strokeWidth={1.8}
                    aria-hidden="true" />
                  
                  </button>
                </li>);

          })}
          </ul>
        </section> :

      <section aria-label="Месяц" className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <StepButton dir="prev" label="Предыдущий месяц" onClick={() => setMonthOffset((v) => v - 1)} />
            <button
            type="button"
            onClick={() => setMonthOffset(0)}
            className="text-[15px] font-medium text-ink">
            
              {month.title}
            </button>
            <StepButton dir="next" label="Следующий месяц" onClick={() => setMonthOffset((v) => v + 1)} />
          </div>
          <div className="grid grid-cols-7 text-center">
            {weekdayShort.map((d) =>
          <span key={d} className="pb-2 text-[11.5px] text-muted">
                {d}
              </span>
          )}
            {month.days.map((day) => {
            const has = countFor(day.date) > 0;
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => navigate(`/day/${day.date}`)}
                aria-label={`${day.dayNumber}${has ? ', есть дела' : ''}`}
                className="flex h-12 flex-col items-center justify-center gap-1">
                
                  <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-[14px] tabular-nums ${
                  day.isToday ?
                  'border border-primary font-semibold text-primary' :
                  day.inMonth ?
                  'text-ink' :
                  'text-muted/60'}`
                  }>
                  
                    {day.dayNumber}
                  </span>
                  <span
                  className={`h-[4px] w-[4px] rounded-full ${has ? 'bg-primary/70' : 'bg-transparent'}`}
                  aria-hidden="true" />
                
                </button>);

          })}
          </div>
        </section>
      }
    </Shell>);

}