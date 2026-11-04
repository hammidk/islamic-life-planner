import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckIcon, ChevronDownIcon, PlusIcon } from 'lucide-react';
import { Shell, SubHeader } from '../components/Shell';
import { DayTaskList } from '../components/DayTaskList';
import { PrayerRow } from '../components/PrayerRow';
import { PrayerTimesError } from '../components/PrayerTimesError';
import { useApp } from '../contexts/AppContext';
import { useLive } from '../contexts/LiveDataContext';
import { useInlineCreateHost, useQuickAdd } from '../contexts/QuickAddContext';
import { InlineCreate } from '../components/task/InlineCreate';
import { formatDateLabel } from '../utils/calendar';
import { formatDuration, fromMinutes, getPrayerState, taskAxisMinutes } from '../utils/prayer';
import { buildTodayPlan } from '../utils/todayPlan';
import type { PlanWindow } from '../utils/todayPlan';
import { TodaySphereList } from '../components/today/TodaySphereList';
import { BlockDragLayer } from '../components/today/BlockDragLayer';
import { applyPlacement, flattenPlan, planItemId, shiftPlacement } from '../utils/blockPlacement';
import { compareOrder } from '../utils/taskOptions';
import { isDoneOn, isOpenOn, isRepeating, occursOn } from '../utils/occurrence';
import type { Task } from '../types';

const byTime = (a: Task, b: Task) =>
taskAxisMinutes(a.time as string) - taskAxisMinutes(b.time as string) || compareOrder(a, b);

/**
 * /today — «Сегодня» с намазами и окнами (только с карточки «Сегодня» на Главной);
 * /day/:date — простой список дел дня из календаря, в том числе для сегодняшней даты.
 */
export function DayTasks() {
  const { todayISO } = useLive();
  const { date: param } = useParams();

  return param ? <OtherDayView date={param} /> : <TodayView date={todayISO} />;
}

function OtherDayView({ date }: {date: string;}) {
  const { tasks } = useApp();
  const { openQuickAdd } = useQuickAdd();
  useInlineCreateHost({ date });

  const dayTasks = tasks.filter((t) => occursOn(t, date));
  const timed = dayTasks.filter((t) => t.time).sort(byTime);
  const untimed = dayTasks.filter((t) => !t.time).sort(compareOrder);
  const ordered = [...timed, ...untimed];

  return (
    <Shell nav>
      <SubHeader title={formatDateLabel(date)} subtitle={`${dayTasks.length} дел`} />
      <InlineCreate />
      {ordered.length > 0 ?
      <DayTaskList tasks={ordered} divider="divide-line" surface="bg-canvas" showDate={false} day={date} /> :

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

/** «История · N» внизу «Сегодня»: свёрнута по умолчанию; снятие отметки возвращает дело на место */
function HistoryBlock({ tasks, day }: {tasks: Task[];day: string;}) {
  const [open, setOpen] = React.useState(false);
  return (
    <section className="mt-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1 px-1 py-1 text-[12px] font-medium uppercase tracking-[0.08em] text-muted">
        
        История · <span className="tabular-nums">{tasks.length}</span>
        <ChevronDownIcon
          className={`h-3.5 w-3.5 transition-transform duration-200 ease-out ${open ? '' : '-rotate-90'}`}
          strokeWidth={2}
          aria-hidden="true" />
        
      </button>
      {open ?
      <div className="opacity-70">
          <DayTaskList tasks={tasks} divider="divide-line" surface="bg-canvas" showDate={false} day={day} />
        </div> :
      null}
    </section>);

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
  const { tasks, journal, prayersDone, sphereSlots, blockPlacement, setBlockPlacement } = useApp();
  const { openQuickAdd } = useQuickAdd();
  // «+» на «Сегодня» создаёт дело без даты (сфера «Прочее») карточкой вверху
  useInlineCreateHost({});
  const { minutes, todayLabel, prayers, sunrise, tahajjud, status } = useLive();
  const todayEntry = journal.find((e) => e.date === date);
  const { next, until } = getPrayerState(minutes);

  /** вхождения дня: повторяющиеся дела — по правилу повтора */
  const dayTasks = tasks.filter((t) => occursOn(t, date));
  const timed = dayTasks.filter((t) => t.time);
  /**
   * История: выполненные сегодня — у повторов выполненное вхождение дня,
   * у обычных — completedOn (в старых данных без него — дела на сегодня)
   */
  const done = tasks.
  filter((t) =>
  isRepeating(t) ?
  t.status !== 'cancelled' && isDoneOn(t, date) :
  t.status === 'done' && (t.completedOn ? t.completedOn === date : occursOn(t, date))
  ).
  sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? ''));

  const listTasks = (sphere: 'rizq' | 'other') =>
  tasks.
  filter(
    (t) =>
    t.sphere === sphere &&
    !t.time && (
    isRepeating(t) ? isOpenOn(t, date) : t.status === 'open' && (!t.date || occursOn(t, date)))
  ).
  sort(compareOrder);

  const rawPlan = buildTodayPlan({
    prayers,
    sunrise,
    tahajjud,
    now: minutes,
    timedTasks: timed.filter((t) => isOpenOn(t, date)),
    busyTasks: timed,
    prayersDone,
    rizqSlot: sphereSlots.rizq
  });
  /** положение «Удела»/«Прочего» — только за сегодня; завтра блоки снова встают сами */
  const todayPlacement = blockPlacement[date];
  const plan = rawPlan ? applyPlacement(rawPlan, todayPlacement) : null;
  const order = plan ? flattenPlan(plan) : [];
  const prayersReady = (status === 'ready' || status === 'stale') && plan !== null;

  /** подряд идущие дела — один список (перетаскивание, свайп, меню) */
  const renderItems = (planWindow: PlanWindow, prayer: React.ReactNode) => {
    const { id: windowId, items } = planWindow;
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
          day={date}
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
      if (item.kind === 'prayer') {
        out.push(<div key="prayer" data-plan-id={planItemId(windowId, item)}>{prayer}</div>);
      } else
      if (item.kind === 'dayEnd') {
        out.push(
          <div key="day-end" data-plan-id="dayEnd">
            <DayEndRow entryId={todayEntry?.id} />
          </div>
        );
      } else
      if (item.kind === 'list') {
        const sphere = item.sphere;
        const up = shiftPlacement(order, sphere, 'up');
        const down = shiftPlacement(order, sphere, 'down');
        out.push(
          <TodaySphereList
            key={`list-${sphere}`}
            sphereId={sphere}
            tasks={listTasks(sphere)}
            slot={item.slot}
            movable
            onUp={up ? () => setBlockPlacement(date, sphere, up) : undefined}
            onDown={down ? () => setBlockPlacement(date, sphere, down) : undefined}
            onReset={todayPlacement?.[sphere] ? () => setBlockPlacement(date, sphere, null) : undefined} />

        );
      } else {
        out.push(
          <button
            key={`free-${windowId}-${item.start}`}
            data-plan-id={planItemId(windowId, item)}
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

      <InlineCreate />

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

      <BlockDragLayer onDrop={(sphere, spot) => setBlockPlacement(date, sphere, spot)}>
          {plan.map((w) =>
        <div key={w.id}>
              {renderItems(
            w,
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
        </BlockDragLayer>
      }

      {done.length > 0 ? <HistoryBlock tasks={done} day={date} /> : null}
    </Shell>);

}
