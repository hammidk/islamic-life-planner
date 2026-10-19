import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek } from
'date-fns';
import { DEFAULT_DURATION } from './prayer';
import { weekdayShort } from './taskOptions';
import type { SphereId, Task } from '../types';

export type StatsRange = 'week' | 'month';

export interface StatsBucket {
  label: string;
  from: string;
  to: string;
}

export interface TaskStatsSummary {
  done: number;
  postponed: number;
  cancelled: number;
  /** минуты: не отменённые */
  planned: number;
  /** минуты: выполненные */
  actual: number;
  bySphere: {id: SphereId;minutes: number;}[];
  buckets: {label: string;value: number;}[];
  /** в периоде есть хоть одна задача */
  hasData: boolean;
}

const iso = (d: Date) => format(d, 'yyyy-MM-dd');
const minutesOf = (t: Task) => t.duration ?? DEFAULT_DURATION;

/** Текущая неделя (пн–вс) или текущий месяц относительно today */
export function rangeBounds(range: StatsRange, today: string): {from: string;to: string;buckets: StatsBucket[];} {
  const parsed = parseISO(today);
  const base = isValid(parsed) ? parsed : new Date();
  if (range === 'week') {
    const monday = startOfWeek(base, { weekStartsOn: 1 });
    const buckets = Array.from({ length: 7 }).map((_, i) => {
      const d = iso(addDays(monday, i));
      return { label: weekdayShort[i], from: d, to: d };
    });
    return { from: buckets[0].from, to: buckets[6].to, buckets };
  }
  const first = startOfMonth(base);
  const last = endOfMonth(base);
  const buckets: StatsBucket[] = [];
  let cursor = first;
  let n = 1;
  while (cursor <= last) {
    const weekEnd = endOfWeek(cursor, { weekStartsOn: 1 });
    const to = weekEnd > last ? last : weekEnd;
    buckets.push({ label: `${n} нед`, from: iso(cursor), to: iso(to) });
    cursor = addDays(to, 1);
    n += 1;
  }
  return { from: iso(first), to: iso(last), buckets };
}

/** Статистика задач периода по дате задачи */
export function computeTaskStats(tasks: Task[], range: StatsRange, today: string): TaskStatsSummary {
  const { from, to, buckets } = rangeBounds(range, today);
  const inRange = tasks.filter((t) => t.date && t.date >= from && t.date <= to);
  const notCancelled = inRange.filter((t) => t.status !== 'cancelled');
  const done = inRange.filter((t) => t.status === 'done');

  const sphereMap = new Map<SphereId, number>();
  done.forEach((t) => sphereMap.set(t.sphere, (sphereMap.get(t.sphere) ?? 0) + minutesOf(t)));

  return {
    done: done.length,
    postponed: inRange.filter((t) => t.status === 'postponed').length,
    cancelled: inRange.filter((t) => t.status === 'cancelled').length,
    planned: notCancelled.reduce((acc, t) => acc + minutesOf(t), 0),
    actual: done.reduce((acc, t) => acc + minutesOf(t), 0),
    bySphere: [...sphereMap.entries()].
    map(([id, minutes]) => ({ id, minutes })).
    sort((a, b) => b.minutes - a.minutes),
    buckets: buckets.map((b) => ({
      label: b.label,
      value: done.filter((t) => t.date as string >= b.from && t.date as string <= b.to).length
    })),
    hasData: inRange.length > 0
  };
}

export const formatHours = (m: number) => `${Math.round(m / 60 * 10) / 10} ч`;