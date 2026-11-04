import { addDays, differenceInCalendarDays, format, getDaysInMonth, isValid, parseISO } from 'date-fns';
import type { Task } from '../types';

/** сколько дней хранить отметки выполненных вхождений */
export const DONE_DATES_KEEP_DAYS = 60;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const parse = (iso: string | undefined): Date | null => {
  if (!iso || !ISO_DAY.test(iso)) return null;
  const d = parseISO(iso);
  return isValid(d) ? d : null;
};

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

/** 0 = Пн … 6 = Вс — как в RepeatRule.weekdays */
const weekdayOf = (d: Date) => (d.getDay() + 6) % 7;

export const isRepeating = (task: Pick<Task, 'repeat'>): boolean =>
Boolean(task.repeat && task.repeat.kind !== 'none');

/**
 * Есть ли дело в этот день. Неповторяющееся — только в свою дату. Повторяющееся — в каждый
 * день по правилу, начиная с даты начала (task.date) и не раньше неё. Повтор без даты
 * начала: «каждый день» и «дни недели» — в каждый подходящий день; «каждые N недель» и
 * «каждый месяц» без опорной даты не определены — не показываются.
 * «Каждый месяц» с 31-го (29-го, 30-го): в коротком месяце — в его последний день.
 */
export function occursOn(task: Pick<Task, 'date' | 'repeat' | 'status'>, day: string): boolean {
  if (task.status === 'cancelled') return false;
  const target = parse(day);
  if (!target) return false;
  const rule = task.repeat;
  if (!rule || rule.kind === 'none') return task.date === day;

  const start = parse(task.date);
  if (start && target < start) return false;

  switch (rule.kind) {
    case 'daily':
      return true;
    case 'weekdays':
      return rule.days.includes(weekdayOf(target));
    case 'weeks': {
      if (!start) return false;
      const diff = differenceInCalendarDays(target, start);
      const every = Math.max(1, Math.floor(rule.every) || 1);
      return diff % 7 === 0 && diff / 7 % every === 0;
    }
    case 'monthly': {
      if (!start) return false;
      const wanted = Math.min(start.getDate(), getDaysInMonth(target));
      return target.getDate() === wanted;
    }
    default:
      return false;
  }
}

/** Выполнено ли дело в этот день: у повторяющегося — своё вхождение, у обычного — статус */
export function isDoneOn(task: Pick<Task, 'repeat' | 'status' | 'doneDates'>, day: string): boolean {
  return isRepeating(task) ? Boolean(task.doneDates?.includes(day)) : task.status === 'done';
}

/** Открытое вхождение в этот день — то, что ещё нужно сделать */
export const isOpenOn = (task: Task, day: string): boolean =>
occursOn(task, day) && !isDoneOn(task, day) && (isRepeating(task) || task.status === 'open');

/** Ближайшее вхождение не раньше from (до года вперёд); null — нет */
export function nextOccurrence(task: Pick<Task, 'date' | 'repeat' | 'status'>, from: string): string | null {
  const d = parse(from);
  if (!d) return null;
  for (let i = 0; i <= 366; i++) {
    const day = iso(addDays(d, i));
    if (occursOn(task, day)) return day;
  }
  return null;
}

/**
 * Дата по умолчанию: если указано время или повтор, а дату не выбирали — сегодня.
 * Дело без времени и без повтора остаётся без даты.
 */
export function withDefaultDate<T extends Pick<Task, 'date' | 'time' | 'repeat'>>(task: T, today: string): T {
  if (task.date || !(task.time || isRepeating(task))) return task;
  return { ...task, date: today };
}

/** Отметить или снять вхождение повторяющегося дела в этот день */
export function toggleDoneDate(doneDates: string[] | undefined, day: string): string[] | undefined {
  const list = doneDates ?? [];
  const next = list.includes(day) ? list.filter((d) => d !== day) : [...list, day].sort();
  return next.length > 0 ? next : undefined;
}

/** Только корректные даты не старше 60 дней от today */
export function pruneDoneDates(raw: unknown, today: string): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const base = parse(today);
  const oldest = base ? iso(addDays(base, -DONE_DATES_KEEP_DAYS)) : '';
  const kept = [...new Set(raw.filter((d): d is string => typeof d === 'string' && parse(d) !== null && d >= oldest))].sort();
  return kept.length > 0 ? kept : undefined;
}
