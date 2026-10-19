import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BookOpenIcon, ChevronRightIcon, PlusIcon } from 'lucide-react';
import { Shell, SubHeader } from '../components/Shell';
import { DayTaskList } from '../components/DayTaskList';
import { PrayerRow } from '../components/PrayerRow';
import { PrayerTimesError } from '../components/PrayerTimesError';
import { SphereIcon } from '../components/SphereIcon';
import { useApp } from '../contexts/AppContext';
import { useLive } from '../contexts/LiveDataContext';
import { useQuickAdd } from '../contexts/QuickAddContext';
import { spheres } from '../data/appData';
import { formatDateLabel } from '../utils/calendar';
import {
  buildDaySchedule,
  formatDuration,
  fromMinutes,
  getPrayerState,
  taskAxisMinutes,
  toMinutes } from
'../utils/prayer';
import { compareOrder } from '../utils/taskOptions';
import type { Task } from '../types';

const byTime = (a: Task, b: Task) =>
taskAxisMinutes(a.time as string) - taskAxisMinutes(b.time as string) || compareOrder(a, b);

const sectionTitle = 'px-1 pb-1 pt-5 text-[12px] font-medium uppercase tracking-[0.08em] text-muted';

/** Один экран дня для /today и /day/:date — плоский список «как Напоминания» */
export function DayTasks() {
  const { todayISO } = useLive();
  const { date: param } = useParams();
  const date = param ?? todayISO;
  const isToday = date === todayISO;

  return isToday ? <TodayView date={date} /> : <OtherDayView date={date} />;
}

function OtherDayView({ date }: {date: string;}) {
  const { tasks } = useApp();
  const { openQuickAdd } = useQuickAdd();

  const dayTasks = tasks.filter((t) => t.date === date && t.status !== 'cancelled');
  const timed = dayTasks.filter((t) => t.time).sort(byTime);
  const untimed = dayTasks.filter((t) => !t.time).sort(compareOrder);
  const ordered = [...timed, ...untimed];

  return (
    <Shell nav>
      <SubHeader title={formatDateLabel(date)} subtitle={`${dayTasks.length} дел`} />
      {ordered.length > 0 ?
      <DayTaskList tasks={ordered} divider="divide-line" surface="bg-canvas" showDate={false} /> :

      <EmptyDay onAdd={() => openQuickAdd({ date })} />
      }
    </Shell>);

}

function EmptyDay({ onAdd }: {onAdd: () => void;}) {
  return (
    <div className="px-1 py-2">
      <p className="text-[14px] text-muted">На этот день дел пока нет.</p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-3 flex items-center gap-1.5 text-[14px] font-medium text-primary">
        
        <PlusIcon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        Добавить дело
      </button>
    </div>);

}

function TodayView({ date }: {date: string;}) {
  const navigate = useNavigate();
  const { tasks, journal } = useApp();
  const { openQuickAdd } = useQuickAdd();
  const { minutes, todayLabel, prayers, sunrise, tahajjud, status } = useLive();
  const todayEntry = journal.find((e) => e.date === date);

  const { current: prayerNow, next, until } = getPrayerState(minutes);
  const tahajjudStart = toMinutes(tahajjud.start);
  const fajrStart = toMinutes(prayers[0]?.time ?? '');
  const tahajjudNow =
  !Number.isNaN(tahajjudStart) && minutes >= tahajjudStart && minutes < toMinutes(tahajjud.end);
  /** в последнюю треть ночи текущим считается Тахаджуд, а не Иша */
  const currentId = tahajjudNow ? 'tahajjud' : prayerNow.id;

  /** выполненные дела уходят из активного списка — они остаются в Истории */
  const open = tasks.filter((t) => t.date === date && t.status === 'open');
  const timed = open.filter((t) => t.time);
  const untimed = open.filter((t) => !t.time).sort(compareOrder);
  const schedule = buildDaySchedule(timed, { fromMinutes: minutes });

  /** дела между началом Тахаджуда и Фаджром */
  const nightTasks = timed.
  filter((t) => {
    const m = toMinutes(t.time as string);
    return m >= tahajjudStart && m < fajrStart;
  }).
  sort((a, b) => (a.time as string).localeCompare(b.time as string));

  const other = spheres.find((s) => s.id === 'other');
  const otherCount = tasks.filter((t) => t.sphere === 'other' && !t.date && t.status === 'open').length;
  const prayersReady = status === 'ready' || status === 'stale';

  return (
    <Shell nav>
      <SubHeader title="Сегодня" subtitle={todayLabel} />

      <p className="mb-2 px-1 text-[13px] text-muted">
        Сейчас <span className="font-medium text-ink-soft">{fromMinutes(minutes)}</span>
        {prayersReady ?
        <>
            {' '}· {next.name} через{' '}
            <span className="font-medium text-primary">{formatDuration(until)}</span>
            {status === 'stale' ?
          <span className="text-[11.5px] text-muted/80"> · приблизительно</span> :
          null}
          </> :
        null}
      </p>

      {status === 'error' ?
      <div className="mt-3">
          <PrayerTimesError />
        </div> :
      status === 'loading' ?
      <div className="divide-y divide-line" aria-busy="true">
          {prayers.map((p) =>
        <p key={p.id} className="px-1 py-3 text-[13.5px] text-muted">
              {p.name} · {p.time}
            </p>
        )}
        </div> :

      <div className="divide-y divide-line">
          {schedule.map((interval) =>
        <React.Fragment key={interval.prayer.id}>
              <PrayerRow
            id={interval.prayer.id}
            name={interval.prayer.name}
            time={interval.prayer.time}
            hint={interval.prayer.id === 'fajr' && sunrise ? `восход ${sunrise}` : undefined}
            isCurrent={interval.prayer.id === currentId} />
          
              {interval.segments.map((segment) =>
          segment.kind === 'busy' ?
          <div key={`busy-${segment.start}`}>
                    <DayTaskList
              tasks={[...segment.tasks].sort(byTime)}
              divider="divide-line"
              surface="bg-canvas"
              showDate={false}
              hideDone />
            
                  </div> :

          <button
            key={`free-${segment.start}`}
            type="button"
            onClick={() => openQuickAdd({ date, time: fromMinutes(segment.start) })}
            aria-label={`Создать дело на ${fromMinutes(segment.start)}`}
            className="block w-full bg-[#FBF1ED]/60 px-3 py-2 text-left text-[12.5px] text-[#9C5B4D] transition-colors duration-150 ease-out hover:bg-[#FBF1ED]">
            
                    Свободно ≈ {formatDuration(segment.freeMinutes ?? segment.end - segment.start)}
                    <span className="tabular-nums text-[#9C5B4D]/70">
                      {' '}· с {fromMinutes(segment.start)}
                    </span>
                  </button>

          )}
            </React.Fragment>
        )}

          <PrayerRow
          id="tahajjud"
          name="Тахаджуд"
          time={`${tahajjud.start} — ${tahajjud.end}`}
          isCurrent={tahajjudNow} />
        
          {nightTasks.length > 0 ?
        <div>
              <DayTaskList
            tasks={nightTasks}
            divider="divide-line"
            surface="bg-canvas"
            showDate={false}
            hideDone />
          
            </div> :
        null}
        </div>
      }

      <h2 className={sectionTitle}>На день</h2>
      {untimed.length > 0 ?
      <DayTaskList
        tasks={untimed}
        divider="divide-line"
        surface="bg-canvas"
        showDate={false}
        hideDone /> :


      <p className="px-1 py-2 text-[13.5px] text-muted">
          Дел без времени на сегодня нет.{' '}
          <button
          type="button"
          onClick={() => openQuickAdd({ date })}
          className="font-medium text-primary">
          
            Добавить
          </button>
        </p>
      }

      {other ?
      <button
        type="button"
        onClick={() => navigate('/sphere/other')}
        className="mt-3 flex w-full items-center gap-3 border-t border-line px-1 py-3 text-left">
        
          <SphereIcon id={other.id} color={other.color} className="h-[17px] w-[17px]" />
          <span className="min-w-0 flex-1 text-[14.5px] text-ink">
            Прочее
            {otherCount > 0 ? <span className="tabular-nums text-muted"> · {otherCount}</span> : null}
          </span>
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.8} aria-hidden="true" />
        </button> :
      null}

      <button
        type="button"
        onClick={() => navigate(todayEntry ? `/journal/entry/${todayEntry.id}` : '/journal')}
        className="mt-5 flex w-full items-center gap-3 rounded-card border border-line bg-surface px-4 py-4 text-left shadow-card transition-colors duration-150 ease-out hover:border-primary/40">
        
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-tint text-primary">
          <BookOpenIcon className="h-[17px] w-[17px]" strokeWidth={1.9} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium text-ink">Завершение дня</span>
          <span className="mt-0.5 block text-[12.5px] text-muted">
            {todayEntry ?
            'Запись за сегодня сохранена' :
            'Благодарность, важное и что улучшить — пара минут'}
          </span>
        </span>
        <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.8} aria-hidden="true" />
      </button>
    </Shell>);

}