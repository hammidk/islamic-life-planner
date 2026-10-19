import { getLive } from './live';
import type { PeriodId, Prayer, Task } from '../types';

const DAY = 24 * 60;

/** Сегодняшняя дата (YYYY-MM-DD) в часовом поясе выбранного места */
export const todayISO = (): string => getLive().todayISO;

export const toMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export const fromMinutes = (minutes: number): string => {
  // время после полуночи (ось суток до Тахаджуда) показывается как 00:30, 01:00
  const clamped = (Math.round(minutes) % DAY + DAY) % DAY;
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
};

/** Текущие минуты суток в часовом поясе выбранного места */
export const nowMinutes = (): number => getLive().minutes;

export interface PrayerState {
  current: Prayer;
  next: Prayer;
  /** минут до следующего намаза */
  until: number;
}

/**
 * Текущий и следующий намаз. До Фаджра (ночью после полуночи) текущим считается
 * Иша предыдущего дня, следующим — Фаджр.
 */
export function getPrayerState(minutes: number): PrayerState {
  const { prayers } = getLive();
  const fajr = prayers[0];
  const isha = prayers[prayers.length - 1];
  const times = prayers.map((p) => toMinutes(p.time));
  if (times.some((t) => Number.isNaN(t))) {
    return { current: isha, next: fajr, until: 0 };
  }
  if (minutes < times[0]) {
    return { current: isha, next: fajr, until: times[0] - minutes };
  }
  let currentIndex = 0;
  for (let i = 0; i < prayers.length; i++) {
    if (minutes >= times[i]) currentIndex = i;
  }
  const nextIndex = (currentIndex + 1) % prayers.length;
  const nextAt = times[nextIndex];
  return {
    current: prayers[currentIndex],
    next: prayers[nextIndex],
    until: nextAt > minutes ? nextAt - minutes : DAY - minutes + nextAt
  };
}

/** Индекс периода дня для текущего намаза (до Фаджра — после Иша) */
export function currentPeriodIndex(minutes: number): number {
  const { prayers } = getLive();
  const { current } = getPrayerState(minutes);
  return Math.max(0, prayers.findIndex((p) => p.id === current.id));
}

export interface ScheduleSegment {
  kind: 'busy' | 'free';
  start: number;
  end: number;
  tasks: Task[];
  /** для свободных: длительность, округлённая вниз до 5 минут */
  freeMinutes?: number;
}

export interface PrayerInterval {
  /** намаз, открывающий период */
  prayer: Prayer;
  /** намаз, закрывающий период (null — после Иша) */
  endsWith: Prayer | null;
  periodId: PeriodId;
  start: number;
  end: number;
  segments: ScheduleSegment[];
  /** задачи периода без точного времени */
  untimed: Task[];
}

export const periodByPrayer: Record<string, PeriodId> = {
  fajr: 'untilDhuhr',
  dhuhr: 'untilAsr',
  asr: 'untilMaghrib',
  maghrib: 'untilIsha',
  isha: 'afterIsha'
};

/** длительность задачи по умолчанию, если не указана */
export const DEFAULT_DURATION = 5;
export const MIN_FREE = 10;

/** Позиция задачи на оси дня: ночные дела до Тахаджуда относятся к вечеру после Иша */
export const taskAxisMinutes = (time: string): number => {
  const m = toMinutes(time);
  const tahajjudStart = toMinutes(getLive().tahajjud.start);
  return !Number.isNaN(tahajjudStart) && m < tahajjudStart ? m + DAY : m;
};

/** Окно намаза, в которое попадает время; без времени — fallback */
export function periodForTime(time: string | undefined, fallback: PeriodId): PeriodId {
  if (!time || !/^\d{1,2}:\d{2}$/.test(time)) return fallback;
  const { prayers } = getLive();
  const times = prayers.map((p) => toMinutes(p.time));
  if (times.length === 0 || times.some((t) => Number.isNaN(t))) return fallback;
  const axis = taskAxisMinutes(time);
  // ночь между Тахаджудом и Фаджром относится к вечеру после Иша
  if (axis < times[0]) return 'afterIsha';
  let index = 0;
  for (let i = 0; i < times.length; i++) {
    if (axis >= times[i]) index = i;
  }
  return periodByPrayer[prayers[index].id] ?? fallback;
}

const floor5 = (n: number) => Math.floor(n / 5) * 5;
const ceil5 = (n: number) => Math.ceil(n / 5) * 5;

/**
 * Раскладывает задачи дня по промежуткам между намазами: занято / свободно.
 * Промежуток — от начала намаза до начала следующего; после Иша — до начала Тахаджуда.
 * Задачи с точным временем встают на своё место по времени, независимо от выбранного периода.
 * Свободное время округляется вниз до 5 минут и показывается от MIN_FREE.
 * С options.fromMinutes (сегодня) прошедшие свободные промежутки отбрасываются,
 * а текущий начинается с «сейчас», округлённого вверх до 5 минут.
 */
export function buildDaySchedule(
tasks: Task[],
options?: {fromMinutes?: number;})
: PrayerInterval[] {
  const active = tasks.filter((t) => t.status !== 'cancelled');
  const { prayers, tahajjud } = getLive();
  const now = options?.fromMinutes;
  const tahajjudStart = toMinutes(tahajjud.start);
  const nowAxis =
  now === undefined ?
  undefined :
  !Number.isNaN(tahajjudStart) && now < tahajjudStart ?
  now + DAY :
  now;

  const finalizeFree = (segments: ScheduleSegment[]): ScheduleSegment[] =>
  segments.flatMap((s) => {
    if (s.kind !== 'free') return [s];
    let start = s.start;
    if (nowAxis !== undefined) {
      if (s.end <= nowAxis) return [];
      if (start < nowAxis) start = ceil5(nowAxis);
    }
    const freeMinutes = floor5(s.end - start);
    return freeMinutes >= MIN_FREE ? [{ ...s, start, freeMinutes }] : [];
  });

  return prayers.map((prayer, index) => {
    const nextPrayer = prayers[index + 1] ?? null;
    const start = toMinutes(prayer.time);
    const end = nextPrayer ? toMinutes(nextPrayer.time) : DAY + toMinutes(tahajjud.start);
    const periodId = periodByPrayer[prayer.id];

    const timed = active.
    filter((t) => Boolean(t.time)).
    map((t) => ({ task: t, start: taskAxisMinutes(t.time as string) })).
    filter((item) => item.start >= start && item.start < end).
    map((item) => ({
      ...item,
      end: Math.min(end, item.start + (item.task.duration ?? DEFAULT_DURATION))
    })).
    sort((a, b) => a.start - b.start);

    const segments: ScheduleSegment[] = [];
    let cursor = start;

    timed.forEach((item) => {
      if (item.start > cursor) {
        segments.push({ kind: 'free', start: cursor, end: item.start, tasks: [] });
      }
      const last = segments[segments.length - 1];
      if (last && last.kind === 'busy' && item.start <= last.end) {
        last.end = Math.max(last.end, item.end);
        last.tasks.push(item.task);
      } else {
        segments.push({ kind: 'busy', start: item.start, end: item.end, tasks: [item.task] });
      }
      cursor = Math.max(cursor, item.end);
    });

    if (end > cursor) {
      segments.push({ kind: 'free', start: cursor, end, tasks: [] });
    }

    return {
      prayer,
      endsWith: nextPrayer,
      periodId,
      start,
      end,
      segments: finalizeFree(segments),
      untimed: active.filter((t) => t.period === periodId && !t.time)
    };
  });
}