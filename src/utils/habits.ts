import { addDays, differenceInCalendarDays, format, isValid, parseISO } from 'date-fns';
import type { Habit } from '../types';

export const HISTORY_DAYS = 28;

const parse = (iso?: string): Date | null => {
  if (!iso) return null;
  const d = parseISO(iso);
  return isValid(d) ? d : null;
};

const daysBetween = (from: string, to: string): number => {
  const a = parse(from);
  const b = parse(to);
  return a && b ? differenceInCalendarDays(b, a) : 0;
};

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

/** 0 = Пн … 6 = Вс */
const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7;

const scheduledDays = (habit: Habit): number[] | null =>
habit.daysOfWeek && habit.daysOfWeek.length > 0 && habit.daysOfWeek.length < 7 ?
habit.daysOfWeek :
null;

const fitHistory = (history: number[]): number[] =>
history.length === HISTORY_DAYS ?
history :
[...new Array<number>(HISTORY_DAYS).fill(0), ...history].slice(-HISTORY_DAYS);

/** Был ли пропущен запланированный день строго между doneDate и сегодня */
function missedScheduledDay(habit: Habit, today: string): boolean {
  const done = parse(habit.doneDate);
  const now = parse(today);
  if (!done || !now) return true;
  const gap = differenceInCalendarDays(now, done);
  if (gap <= 1) return false;
  const days = scheduledDays(habit);
  if (!days) return true;
  for (let i = 1; i < Math.min(gap, 400); i++) {
    if (days.includes(weekdayIndex(addDays(done, i)))) return true;
  }
  return false;
}

/** Завершена ли привычка по окончанию: число повторений или дата */
function isFinished(habit: Habit, today: string, completedCount: number): boolean {
  const end = habit.end;
  if (!end || end.kind === 'none') return false;
  if (end.kind === 'count') return end.count > 0 && completedCount >= end.count;
  return Boolean(end.date) && today > end.date;
}

/**
 * Приводит привычку к сегодняшнему дню: сбрасывает отметку, обнуляет серию при пропуске
 * запланированного дня, сдвигает историю и проверяет окончание по дате.
 * Возвращает тот же объект, если менять нечего.
 */
export function rollHabit(habit: Habit, today: string): Habit {
  const history = fitHistory(habit.history);
  const shift = Math.max(0, daysBetween(habit.historyDate ?? today, today));
  const nextHistory =
  shift > 0 ?
  [...history, ...new Array<number>(Math.min(shift, HISTORY_DAYS)).fill(0)].slice(-HISTORY_DAYS) :
  history;
  const doneToday = habit.doneDate === today;
  const streak = missedScheduledDay(habit, today) ? 0 : habit.streak;
  const finished =
  habit.finished || isFinished(habit, today, habit.completedCount ?? 0) ? true : habit.finished;

  if (
  shift === 0 &&
  habit.historyDate === today &&
  history === habit.history &&
  doneToday === habit.doneToday &&
  streak === habit.streak &&
  finished === habit.finished)
  {
    return habit;
  }
  return { ...habit, history: nextHistory, historyDate: today, doneToday, streak, finished };
}

/** Предыдущий запланированный день до today (для отката отметки) */
function previousScheduled(habit: Habit, today: string): string | undefined {
  const now = parse(today);
  if (!now) return undefined;
  const days = scheduledDays(habit);
  if (!days) return iso(addDays(now, -1));
  for (let i = 1; i <= 7; i++) {
    const d = addDays(now, -i);
    if (days.includes(weekdayIndex(d))) return iso(d);
  }
  return undefined;
}

/** Отметка / снятие отметки за сегодня с корректной серией и счётчиком повторений */
export function toggleHabitToday(habit: Habit, today: string): Habit {
  const rolled = rollHabit(habit, today);
  const history = [...rolled.history];
  const last = history.length - 1;

  if (rolled.doneDate === today) {
    const streak = Math.max(0, rolled.streak - 1);
    const completedCount = Math.max(0, (rolled.completedCount ?? 0) - 1);
    history[last] = 0;
    return {
      ...rolled,
      history,
      doneToday: false,
      streak,
      completedCount,
      finished: isFinished(rolled, today, completedCount),
      // серия > 0 означает, что предыдущий запланированный день был выполнен
      doneDate: streak > 0 ? previousScheduled(rolled, today) : undefined
    };
  }

  const streak = rolled.streak + 1;
  const completedCount = (rolled.completedCount ?? 0) + 1;
  history[last] = 1;
  return {
    ...rolled,
    history,
    doneToday: true,
    streak,
    bestStreak: Math.max(rolled.bestStreak, streak),
    doneDate: today,
    completedCount,
    finished: isFinished(rolled, today, completedCount)
  };
}

/** ISO-дата для индекса в history */
export function historyIndexDate(habit: Habit, index: number, today: string): string {
  const base = parse(habit.historyDate ?? today) ?? parse(today) ?? new Date();
  return iso(addDays(base, index - (habit.history.length - 1)));
}