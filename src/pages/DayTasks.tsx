import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckIcon, ChevronRightIcon, PlusIcon } from 'lucide-react';
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
import { formatDuration, fromMinutes, getPrayerState, taskAxisMinutes } from '../utils/prayer';
import { buildTodayPlan } from '../utils/todayPlan';
import type { PlanItem } from '../utils/todayPlan';
import { compareOrder } from '../utils/taskOptions';
import type { Task } from '../types';

const byTime = (a: Task, b: Task) =>
taskAxisMinutes(a.time as string) - taskAxisMinutes(b.time as string) || compareOrder(a, b);

const sectionTitle = 'px-1 pb-1 pt-6 text-[12px] font-medium uppercase tracking-[0.08em] text-muted';

/** фон «Удела» в расписании: цвет сферы (#6E6AA6) с прозрачностью 12% поверх canvas, непрозрачный */
const RIZQ_SLOT_SURFACE = 'bg-[#E5E5EB]';

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

/** Список сферы «Удел» или «Прочее» на «Сегодня»: открытые дела без времени на сегодня или без даты */
function SphereList({
  sphereId,
  tasks,
  slot



}: {sphereId: 'rizq' | 'other';tasks: Task[];slot?: {start: number;end: number;};}) {
  const navigate = useNavigate();
  const sphere = spheres.find((s) => s.id === sphereId) ?? spheres[spheres.length - 1];
  const surface = slot ? RIZQ_SLOT_SURFACE : 'bg-canvas';

  return (
    <div className={slot ? `-mx-5 px-5 ${RIZQ_SLOT_SURFACE}` : ''}>
      <button
        type="button"
        onClick={() => navigate(`/sphere/${sphere.id}`)}
        className="flex w-full items-center gap-2.5 py-2.5 text-left">
        
        <SphereIcon id={sphere.id} color={sphere.color} className="h-[16px] w-[16px]" />
        <span className={`min-w-0 flex-1 truncate text-[14px] font-medium ${slot ? 'text-ink' : 'text-muted'}`}>
          {sphere.name}
          {tasks.length > 0 ? <span className="tabular-nums font-normal text-muted"> · {tasks.length}</span> : null}
          {slot ?
          <span className="tabular-nums font-normal text-muted">
              {' '}· {fromMinutes(slot.start)}–{fromMinutes(slot.end)}
            </span> :
          null}
        </span>
        <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.8} aria-hidden="true" />
      </button>
      {tasks.length > 0 ?
      <div className="pl-[26px]">
          <DayTaskList tasks={tasks} divider="divide-line" surface={surface} showDate={false} hideDone />
        </div> :
      null}
    </div>);

}

/** «Завершение дня» — строка как задача: отметка, если запись за сегодня уже есть */
function DayEndRow({ entryId }: {entryId?: string;}) {
  const navigate = useNavigate();
  const done = Boolean(entryId);
  return (
    <button
      type="button"
      onClick={() => navigate(entryId ? `/journal/entry/${entryId}` : '/journal')}
      className="flex w-full items-center gap-3 py-3 text-left">
      
      <span
        className={`flex h-[23px] w-[23px] shrink-0 items-center justify-center self-start rounded-full border ${
        done ? 'border-primary bg-primary' : 'border-[#CBD2C9]'}`
        }
        aria-hidden="true">
        
        {done ? <CheckIcon className="h-3.5 w-3.5 text-white" strokeWidth={2.6} /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] leading-snug text-ink">Завершение дня</span>
        <span className="mt-0.5 block truncate text-[12.5px] text-muted">
          Благодарность, важное и что улучшить
        </span>
      </span>
    </button>);

}

function TodayView({ date }: {date: string;}) {
  const { tasks, journal, prayersDone, sphereSlots } = useApp();
  const { openQuickAdd } = useQuickAdd();
  const { minutes, todayLabel, prayers, sunrise, tahajjud, status } = useLive();
  const todayEntry = journal.find((e) => e.date === date);
  const { next, until } = getPrayerState(minutes);

  const dayTasks = tasks.filter((t) => t.date === date && t.status !== 'cancelled');
  const timed = dayTasks.filter((t) => t.time);
  /** выполненные дела уходят из окон в отдельный список внизу */
  const done = dayTasks.
  filter((t) => t.status === 'done').
  sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? ''));

  const listTasks = (sphere: 'rizq' | 'other') =>
  tasks.
  filter(
    (t) =>
    t.sphere === sphere &&
    t.status === 'open' &&
    !t.time &&
    !t.parentId && (
    !t.date || t.date === date)
  ).
  sort(compareOrder);

  const plan = buildTodayPlan({
    prayers,
    sunrise,
    tahajjud,
    now: minutes,
    timedTasks: timed.filter((t) => t.status === 'open'),
    busyTasks: timed,
    prayersDone,
    rizqSlot: sphereSlots.rizq
  });
  const prayersReady = (status === 'ready' || status === 'stale') && plan !== null;

  /** подряд идущие дела — один список (перетаскивание, свайп, меню) */
  const renderItems = (windowId: string, items: PlanItem[], prayer: React.ReactNode) => {
    const out: React.ReactNode[] = [];
    let run: Task[] = [];
    const flush = () => {
      if (run.length === 0) return;
      out.push(
        <DayTaskList
          key={`tasks-${run[0].id}`}
          tasks={run}
          divider="divide-line"
          surface="bg-canvas"
          showDate={false}
          sphereColor
          hideDone />

      );
      run = [];
    };
    items.forEach((item) => {
      if (item.kind === 'task') {
        run.push(item.task);
        return;
      }
      flush();
      if (item.kind === 'prayer') out.push(<React.Fragment key="prayer">{prayer}</React.Fragment>);else
      if (item.kind === 'dayEnd') out.push(<DayEndRow key="day-end" entryId={todayEntry?.id} />);else
      if (item.kind === 'list') {
        out.push(
          <SphereList
            key={`list-${item.sphere}`}
            sphereId={item.sphere}
            tasks={listTasks(item.sphere)}
            slot={item.slot} />

        );
      } else {
        out.push(
          <button
            key={`free-${windowId}-${item.start}`}
            type="button"
            onClick={() => openQuickAdd({ date, time: fromMinutes(item.start) })}
            aria-label={`Создать дело на ${fromMinutes(item.start)}`}
            className="block w-full py-2 text-left text-[12.5px] text-[#B4443A]/85">
            
            Свободно ≈ {formatDuration(item.minutes)}
            <span className="tabular-nums"> · с {fromMinutes(item.start)}</span>
          </button>
        );
      }
    });
    flush();
    return out;
  };

  return (
    <Shell nav>
      <SubHeader title="Сегодня" subtitle={todayLabel} />

      <p className="mb-3 px-1 text-[13px] text-muted">
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
      !prayersReady || !plan ?
      <div className="divide-y divide-line" aria-busy="true">
          {prayers.map((p) =>
        <p key={p.id} className="px-1 py-3 text-[13.5px] text-muted">
              {p.name} · {p.time}
            </p>
        )}
        </div> :

      <div>
          {plan.map((w) =>
        <div key={w.id}>
              {renderItems(
            w.id,
            w.items,
            <PrayerRow
              id={w.id}
              name={w.name}
              time={w.timeLabel}
              hint={w.id === 'fajr' && sunrise ? `восход ${sunrise}` : undefined}
              isCurrent={w.isActive}
              isLate={w.isLate} />

          )}
            </div>
        )}
        </div>
      }

      {done.length > 0 ?
      <>
          <h2 className={sectionTitle}>Выполнено · {done.length}</h2>
          <div className="opacity-70">
            <DayTaskList tasks={done} divider="divide-line" surface="bg-canvas" showDate={false} />
          </div>
        </> :
      null}
    </Shell>);

}
