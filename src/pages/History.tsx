import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckIcon, ChevronRightIcon } from 'lucide-react';
import { useLive } from '../contexts/LiveDataContext';
import { Shell, SubHeader } from '../components/Shell';
import { useApp } from '../contexts/AppContext';
import { formatDateLabel } from '../utils/calendar';
import { historyIndexDate } from '../utils/habits';

interface PastDay {
  date: string;
  done: number;
  total: number;
  prayers: number;
  habits: number;
  journal: boolean;
}

/** «Выполнено 3 из 5 · намазов 4 · привычек 2 · запись в дневнике» */
function summary(day: PastDay): string {
  const parts: string[] = [];
  if (day.total > 0) parts.push(`Выполнено ${day.done} из ${day.total}`);
  if (day.prayers > 0) parts.push(`намазов ${day.prayers}`);
  if (day.habits > 0) parts.push(`привычек ${day.habits}`);
  if (day.journal) parts.push('запись в дневнике');
  const text = parts.join(' · ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function History() {
  const navigate = useNavigate();
  const { tasks, prayersDone, prayersByDate, habits, journal } = useApp();
  const { todayISO: APP_DATE, prayers, tahajjud } = useLive();
  const allPrayers = [{ id: 'tahajjud', name: 'Тахаджуд', time: tahajjud.start }, ...prayers];

  const doneToday = tasks.
  filter((t) => t.date === APP_DATE && t.status === 'done').
  sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
  const prayersToday = allPrayers.filter((p) => prayersDone[p.id]);

  const todayDone = tasks.filter((t) => t.date === APP_DATE && t.status === 'done').length;
  const todayTotal = tasks.filter((t) => t.date === APP_DATE && t.status !== 'cancelled').length;

  /** прошедшие дни собираются из реальных отметок: дела, намазы, привычки, дневник */
  const pastDays = useMemo(() => {
    const map = new Map<string, PastDay>();
    const day = (date: string): PastDay => {
      let entry = map.get(date);
      if (!entry) {
        entry = { date, done: 0, total: 0, prayers: 0, habits: 0, journal: false };
        map.set(date, entry);
      }
      return entry;
    };

    tasks.forEach((t) => {
      if (!t.date || t.date >= APP_DATE || t.status === 'cancelled') return;
      const entry = day(t.date);
      entry.total += 1;
      if (t.status === 'done') entry.done += 1;
    });
    Object.entries(prayersByDate).forEach(([date, marks]) => {
      if (date >= APP_DATE) return;
      const count = Object.values(marks).filter(Boolean).length;
      if (count > 0) day(date).prayers += count;
    });
    habits.forEach((h) => {
      h.history.forEach((v, i) => {
        if (!v) return;
        const date = historyIndexDate(h, i, APP_DATE);
        if (date < APP_DATE) day(date).habits += 1;
      });
    });
    journal.forEach((e) => {
      if (e.date && e.date < APP_DATE) day(e.date).journal = true;
    });

    return [...map.values()].sort((a, b) => b.date.localeCompare(a.date));
  }, [tasks, prayersByDate, habits, journal, APP_DATE]);

  return (
    <Shell nav>
      <SubHeader title="История" subtitle="Как проходили прошедшие дни" />

      {doneToday.length > 0 || prayersToday.length > 0 ?
      <section aria-labelledby="done-today" className="mb-6">
          <h2
          id="done-today"
          className="mb-2 px-1 text-[12px] font-medium uppercase tracking-[0.08em] text-muted">
          
            Выполнено сегодня
          </h2>
          <div className="divide-y divide-line rounded-card border border-line bg-surface shadow-card">
            {prayersToday.map((p) =>
          <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <CheckIcon className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.4} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-[15px] text-ink">{p.name}</span>
                <span className="shrink-0 text-[12.5px] tabular-nums text-muted">{p.time}</span>
              </div>
          )}
            {doneToday.map((t) =>
          <button
            key={t.id}
            type="button"
            onClick={() => navigate(`/task/${t.id}`)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 ease-out hover:bg-canvas/60">
            
                <CheckIcon className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.4} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-[15px] text-ink-soft">{t.title}</span>
                {t.completedAt ?
            <span className="shrink-0 text-[12.5px] tabular-nums text-muted">{t.completedAt}</span> :
            null}
              </button>
          )}
          </div>
        </section> :
      null}

      <div className="divide-y divide-line rounded-card border border-line bg-surface shadow-card">
        <button
          type="button"
          onClick={() => navigate('/today')}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-150 ease-out hover:bg-canvas/60">
          
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium text-primary">Сегодня</p>
            <p className="mt-0.5 text-[12.5px] text-muted">
              Выполнено {todayDone} из {todayTotal}
            </p>
          </div>
          <ChevronRightIcon
            className="h-4 w-4 shrink-0 text-muted"
            strokeWidth={1.8}
            aria-hidden="true" />
          
        </button>

        {pastDays.map((day) =>
        <button
          key={day.date}
          type="button"
          onClick={() => navigate(`/day/${day.date}`)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-150 ease-out hover:bg-canvas/60">
          
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] text-ink">{formatDateLabel(day.date)}</p>
              <p className="mt-0.5 truncate text-[12.5px] text-muted">{summary(day)}</p>
              {day.total > 0 ?
            <span className="mt-2 block h-[4px] w-full overflow-hidden rounded-full bg-canvas">
                  <span
                className="block h-full rounded-full bg-primary/70"
                style={{ width: `${day.done / day.total * 100}%` }} />
              
                </span> :
            null}
            </div>
            <ChevronRightIcon
            className="h-4 w-4 shrink-0 text-muted"
            strokeWidth={1.8}
            aria-hidden="true" />
          
          </button>
        )}
      </div>

      {pastDays.length === 0 ?
      <p className="mt-5 px-1 text-[13.5px] leading-relaxed text-muted">
          Прошедших дней пока нет. Они появятся здесь, когда вы начнёте отмечать дела, намазы и
          привычки.
        </p> :

      <p className="mt-5 px-1 text-[12.5px] leading-relaxed text-muted">
          История нужна, чтобы замечать закономерности, а не считать проценты.
        </p>
      }
    </Shell>);

}