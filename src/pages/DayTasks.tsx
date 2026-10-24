import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckIcon, ChevronDownIcon, PlusIcon } from 'lucide-react';
import { Shell, SubHeader } from '../components/Shell';
import { DayTaskList } from '../components/DayTaskList';
import { PrayerRow } from '../components/PrayerRow';
import { PrayerTimesError } from '../components/PrayerTimesError';
import { useApp } from '../contexts/AppContext';
import { useLive } from '../contexts/LiveDataContext';
import { useQuickAdd } from '../contexts/QuickAddContext';
import { formatDateLabel } from '../utils/calendar';
import { formatDuration, fromMinutes, getPrayerState, taskAxisMinutes } from '../utils/prayer';
import { buildTodayPlan } from '../utils/todayPlan';
import type { PlanItem, PlanWindow } from '../utils/todayPlan';
import { readPref, writePref } from '../utils/localPrefs';
import { TodaySphereList } from '../components/today/TodaySphereList';
import { useSheetBackGuard } from '../hooks/useSheetBackGuard';
import { compareOrder } from '../utils/taskOptions';
import type { Task } from '../types';

const byTime = (a: Task, b: Task) =>
taskAxisMinutes(a.time as string) - taskAxisMinutes(b.time as string) || compareOrder(a, b);

type MovableSphere = 'rizq' | 'other';
type BlockPositions = Partial<Record<MovableSphere, string>>;

/** положение «Удела» и «Прочего» по окнам — только на этот день, завтра снова по умолчанию */
const blocksKey = (date: string) => `ilp.today.blocks.${date}`;

function saveBlockPositions(date: string, value: BlockPositions): void {
  writePref(blocksKey(date), value);
  try {
    // ключи прошлых дней больше не нужны
    Object.keys(localStorage).
    filter((k) => k.startsWith('ilp.today.blocks.') && k !== blocksKey(date)).
    forEach((k) => localStorage.removeItem(k));
  } catch {

    /* без хранилища — не страшно */}
}

/** Переносит списки (без слота) в выбранные окна: сразу под намазом, как по умолчанию */
function applyBlockPositions(plan: PlanWindow[], positions: BlockPositions): PlanWindow[] {
  const windows = plan.map((w) => ({ ...w, items: [...w.items] }));
  (['rizq', 'other'] as MovableSphere[]).forEach((sphere) => {
    const target = windows.find((w) => w.id === positions[sphere]);
    if (!target) return;
    const isMovable = (item: PlanItem) => item.kind === 'list' && item.sphere === sphere && !item.slot;
    const from = windows.find((w) => w.items.some(isMovable));
    if (!from || from === target) return;
    const item = from.items.find(isMovable) as PlanItem;
    from.items = from.items.filter((i) => i !== item);
    const head = target.items.findIndex(
      (i) => !(i.kind === 'prayer' || i.kind === 'dayEnd' || i.kind === 'list' && !i.slot)
    );
    target.items.splice(head === -1 ? target.items.length : head, 0, item);
  });
  return windows;
}

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

/** «История · N» внизу «Сегодня»: свёрнута по умолчанию; снятие отметки возвращает дело на место */
function HistoryBlock({ tasks }: {tasks: Task[];}) {
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
          <DayTaskList tasks={tasks} divider="divide-line" surface="bg-canvas" showDate={false} />
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
  const { tasks, journal, prayersDone, sphereSlots } = useApp();
  const { openQuickAdd } = useQuickAdd();
  const { minutes, todayLabel, prayers, sunrise, tahajjud, status } = useLive();
  const todayEntry = journal.find((e) => e.date === date);
  const { next, until } = getPrayerState(minutes);

  const dayTasks = tasks.filter((t) => t.date === date && t.status !== 'cancelled');
  const timed = dayTasks.filter((t) => t.time);
  /** История: выполненные сегодня (в старых данных без completedOn — дела на сегодня) */
  const done = tasks.
  filter((t) => t.status === 'done' && (t.completedOn ? t.completedOn === date : t.date === date)).
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

  const [positions, setPositions] = React.useState<BlockPositions>(() => readPref(blocksKey(date), {}));
  const [moving, setMoving] = React.useState<MovableSphere | null>(null);
  React.useEffect(() => {
    setPositions(readPref(blocksKey(date), {}));
  }, [date]);
  // режим переноса закрывается жестом «назад», как окно
  useSheetBackGuard(moving !== null, () => setMoving(null));

  const moveTo = (sphere: MovableSphere, windowId: string) => {
    const next = { ...positions, [sphere]: windowId };
    setPositions(next);
    saveBlockPositions(date, next);
    setMoving(null);
  };

  /** отпускание после перетаскивания: окно, над зоной которого палец */
  const dropAt = (sphere: MovableSphere, point: {x: number;y: number;}) => {
    const zones = Array.from(document.querySelectorAll<HTMLElement>('[data-drop-window]'));
    const zone = zones.find((el) => {
      const r = el.getBoundingClientRect();
      return point.y >= r.top + window.scrollY - 16 && point.y <= r.bottom + window.scrollY + 16;
    });
    if (zone?.dataset.dropWindow) moveTo(sphere, zone.dataset.dropWindow);else
    setMoving(null);
  };

  const rawPlan = buildTodayPlan({
    prayers,
    sunrise,
    tahajjud,
    now: minutes,
    timedTasks: timed.filter((t) => t.status === 'open'),
    busyTasks: timed,
    prayersDone,
    rizqSlot: sphereSlots.rizq
  });
  const plan = rawPlan ? applyBlockPositions(rawPlan, positions) : null;
  const prayersReady = (status === 'ready' || status === 'stale') && plan !== null;

  /** подряд идущие дела — один список (перетаскивание, свайп, меню) */
  const renderItems = (planWindow: PlanWindow, prayer: React.ReactNode) => {
    const { id: windowId, items } = planWindow;
    const out: React.ReactNode[] = [];
    /** зона вставки — под намазом окна (или в начале окна, если намаз отмечен) */
    const zone = moving ?
    <button
      key="drop-zone"
      type="button"
      data-drop-window={windowId}
      onClick={() => moveTo(moving, windowId)}
      className="my-1.5 flex w-full items-center justify-center rounded-xl border border-dashed border-primary/50 bg-primary-tint/70 py-2.5 text-[13px] font-medium text-primary">
      
        Перенести сюда · {planWindow.name}
      </button> :
    null;
    if (zone && !items.some((i) => i.kind === 'prayer')) out.push(zone);
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
      if (item.kind === 'prayer') {
        out.push(<React.Fragment key="prayer">{prayer}</React.Fragment>);
        if (zone) out.push(zone);
      } else
      if (item.kind === 'dayEnd') out.push(<DayEndRow key="day-end" entryId={todayEntry?.id} />);else
      if (item.kind === 'list') {
        const sphere = item.sphere;
        out.push(
          <TodaySphereList
            key={`list-${sphere}`}
            sphereId={sphere}
            tasks={listTasks(sphere)}
            slot={item.slot}
            moving={moving === sphere}
            onToggleMove={() => setMoving((m) => m === sphere ? null : sphere)}
            onDragStart={() => setMoving(sphere)}
            onDrop={(point) => dropAt(sphere, point)} />

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
        </div>
      }

      {done.length > 0 ? <HistoryBlock tasks={done} /> : null}
    </Shell>);

}
