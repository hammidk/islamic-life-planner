import { MIN_FREE, toMinutes } from './prayer';
import type { Prayer, SphereSlot, Task } from '../types';

const DAY = 24 * 60;

/**
 * Длительность дела без указанной длительности — только для расписания «Сегодня».
 * Статистика продолжает считать по DEFAULT_DURATION.
 */
export const SCHEDULE_DURATION = 30;
/** остаток окна, после которого неотмеченный намаз подсвечивается красным */
export const PRAYER_WARNING_MINUTES = 40;

export type PlanItem =
{kind: 'prayer';} |
/** «Завершение дня» под Иша */
{kind: 'dayEnd';} |
{kind: 'task';task: Task;start: number;} |
/** список сферы «Удел» или «Прочее»; slot — у «Удела» задано время в расписании */
{kind: 'list';sphere: 'rizq' | 'other';slot?: {start: number;end: number;};} |
{kind: 'free';start: number;minutes: number;};

export interface PlanWindow {
  id: string;
  name: string;
  /** «16:10» или «02:40 — 05:10» у Тахаджуда */
  timeLabel: string;
  /** минуты на оси дня (ночь до Фаджра — после полуночи, +24 ч) */
  start: number;
  end: number;
  /** намаз окна отмечен — его блок не показывается */
  prayerDone: boolean;
  /** окно, в котором сейчас текущее время */
  isActive: boolean;
  /** неотмеченный текущий намаз, до конца которого меньше 40 минут (или уже прошёл) */
  isLate: boolean;
  items: PlanItem[];
}

export interface PlanInput {
  /** пять обязательных намазов по порядку */
  prayers: Prayer[];
  sunrise: string;
  tahajjud: {start: string;end: string;};
  /** текущие минуты суток */
  now: number;
  /** открытые дела дня с точным временем — строки расписания */
  timedTasks: Task[];
  /** все неотменённые дела дня с временем (включая выполненные) — занимают время */
  busyTasks: Task[];
  prayersDone: Record<string, boolean>;
  /** время «Удела» в расписании */
  rizqSlot?: SphereSlot;
}

const floor5 = (n: number) => Math.floor(n / 5) * 5;

const durationOf = (task: Task) =>
task.duration && task.duration > 0 ? task.duration : SCHEDULE_DURATION;

/**
 * Раскладывает «Сегодня» по окнам намазов. Окно — от начала намаза до начала следующего,
 * Иша — до Тахаджуда, Тахаджуд — до Фаджра. Намаз всегда первая строка своего окна.
 * Дело, которое идёт через начало следующего намаза, остаётся в своём окне, пока намаз
 * не наступил, и переходит под намаз, когда его время пришло.
 * null — времена намазов неизвестны.
 */
export function buildTodayPlan(input: PlanInput): PlanWindow[] | null {
  const { prayers, sunrise, tahajjud, now, prayersDone, rizqSlot } = input;
  const starts = prayers.map((p) => toMinutes(p.time));
  const tahajjudStart = toMinutes(tahajjud.start);
  if (prayers.length === 0 || starts.some(Number.isNaN) || Number.isNaN(tahajjudStart)) return null;

  const fajr = starts[0];
  /** всё, что раньше Фаджра, относится к ночи после Иша */
  const axis = (minutes: number) => minutes < fajr ? minutes + DAY : minutes;
  const nowAxis = axis(now);

  const windows: PlanWindow[] = prayers.map((prayer, i) => ({
    id: prayer.id,
    name: prayer.name,
    timeLabel: prayer.time,
    start: starts[i],
    end: i + 1 < prayers.length ? starts[i + 1] : axis(tahajjudStart),
    prayerDone: Boolean(prayersDone[prayer.id]),
    isActive: false,
    isLate: false,
    items: []
  }));
  windows.push({
    id: 'tahajjud',
    name: 'Тахаджуд',
    timeLabel: `${tahajjud.start} — ${tahajjud.end}`,
    start: axis(tahajjudStart),
    end: fajr + DAY,
    prayerDone: Boolean(prayersDone.tahajjud),
    isActive: false,
    isLate: false,
    items: []
  });

  windows.forEach((w) => {
    w.isActive = nowAxis >= w.start && nowAxis < w.end;
  });

  /* красный блок: текущий обязательный намаз не отмечен, а его время почти вышло */
  const sunriseAxis = toMinutes(sunrise);
  const currentIndex = starts.reduce((found, s, i) => nowAxis >= s ? i : found, prayers.length - 1);
  const current = windows[currentIndex];
  const currentEnd =
  current.id === 'fajr' ?
  Number.isNaN(sunriseAxis) ? starts[1] : sunriseAxis :
  current.id === 'isha' ?
  fajr + DAY :
  starts[currentIndex + 1];
  current.isLate = !current.prayerDone && currentEnd - nowAxis < PRAYER_WARNING_MINUTES;

  /** окно для интервала: по началу, но если интервал идёт через начало следующих окон, */
  /** уже наступивших, — в последнее из них */
  const windowFor = (start: number, end: number): number => {
    let index = windows.findIndex((w) => start >= w.start && start < w.end);
    if (index === -1) return -1;
    while (index + 1 < windows.length && end > windows[index + 1].start && nowAxis >= windows[index + 1].start) {
      index += 1;
    }
    return index;
  };

  const timed: {window: number;item: PlanItem;start: number;}[] = [];

  input.timedTasks.forEach((task) => {
    const start = axis(toMinutes(task.time as string));
    if (Number.isNaN(start)) return;
    const window = windowFor(start, start + durationOf(task));
    if (window !== -1) timed.push({ window, start, item: { kind: 'task', task, start } });
  });

  const slotStart = rizqSlot ? toMinutes(rizqSlot.start) : NaN;
  const slot = Number.isNaN(slotStart) ?
  undefined :
  { start: axis(slotStart), end: axis(slotStart) + (rizqSlot as SphereSlot).duration };
  if (slot) {
    const window = windowFor(slot.start, slot.end);
    if (window !== -1) {
      timed.push({ window, start: slot.start, item: { kind: 'list', sphere: 'rizq', slot } });
    }
  }

  /* «Свободно» — только в окнах, которые ещё не наступили */
  const busy = input.busyTasks.
  map((task) => {
    const start = axis(toMinutes(task.time as string));
    return { start, end: start + durationOf(task) };
  }).
  filter((b) => !Number.isNaN(b.start));
  if (slot) busy.push(slot);

  windows.forEach((w, index) => {
    if (w.id === 'tahajjud' || w.start <= nowAxis) return;
    const inside = busy.
    filter((b) => b.end > w.start && b.start < w.end).
    map((b) => ({ start: Math.max(b.start, w.start), end: Math.min(b.end, w.end) })).
    sort((a, b) => a.start - b.start);
    let cursor = w.start;
    const pushFree = (until: number) => {
      const minutes = floor5(until - cursor);
      if (minutes >= MIN_FREE) {
        timed.push({ window: index, start: cursor, item: { kind: 'free', start: cursor, minutes } });
      }
    };
    inside.forEach((b) => {
      if (b.start > cursor) pushFree(b.start);
      cursor = Math.max(cursor, b.end);
    });
    if (w.end > cursor) pushFree(w.end);
  });

  windows.forEach((w, index) => {
    if (!w.prayerDone) w.items.push({ kind: 'prayer' });
    if (w.id === 'isha') w.items.push({ kind: 'dayEnd' });
    if (w.isActive) {
      if (!slot) w.items.push({ kind: 'list', sphere: 'rizq' });
      w.items.push({ kind: 'list', sphere: 'other' });
    }
    timed.
    filter((t) => t.window === index).
    sort((a, b) => a.start - b.start || (a.item.kind === 'free' ? 1 : 0) - (b.item.kind === 'free' ? 1 : 0)).
    forEach((t) => w.items.push(t.item));
  });

  return windows;
}
