import {
  addDays,
  addMonths,
  addWeeks,
  format,
  isSameDay,
  isSameMonth,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek } from
'date-fns';
import { ru } from 'date-fns/locale';
import { todayISO } from './prayer';

export interface WeekDay {
  /** ISO-дата, например 2026-09-01 */
  date: string;
  /** «Вторник» */
  weekday: string;
  /** «Вт» */
  weekdayShort: string;
  /** «1 сентября» */
  label: string;
  /** «1» */
  dayNumber: string;
  /** «сен» */
  monthShort: string;
  isToday: boolean;
  isPast: boolean;
}

/** Индекс: 0 — воскресенье (как в Date.getDay) */
const weekdayShorts = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

const monthShorts = [
'янв',
'фев',
'мар',
'апр',
'май',
'июн',
'июл',
'авг',
'сен',
'окт',
'ноя',
'дек'];


const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/**
 * Дни недели, отсортированные по ближайшей дате: сегодня → далее → прошедшие.
 * weekOffset: 0 — текущая неделя, 1 — следующая, -1 — предыдущая.
 */
const safeToday = (): Date => {
  const d = parseISO(todayISO());
  return isValid(d) ? d : new Date();
};

export interface MonthDay {
  date: string;
  dayNumber: string;
  inMonth: boolean;
  isToday: boolean;
}

/** Сетка месяца: недели с понедельника, 7 колонок. monthOffset: 0 — текущий месяц */
export function getMonthGrid(monthOffset = 0): {title: string;days: MonthDay[];} {
  const today = safeToday();
  const month = addMonths(startOfMonth(today), monthOffset);
  const first = startOfWeek(month, { weekStartsOn: 1 });
  const days: MonthDay[] = [];
  let cursor = first;
  // 6 недель покрывают любой месяц; лишнюю последнюю неделю отбрасываем
  for (let i = 0; i < 42; i++) {
    days.push({
      date: format(cursor, 'yyyy-MM-dd'),
      dayNumber: format(cursor, 'd'),
      inMonth: isSameMonth(cursor, month),
      isToday: isSameDay(cursor, today)
    });
    cursor = addDays(cursor, 1);
  }
  const trimmed = days.slice(35).some((d) => d.inMonth) ? days : days.slice(0, 35);
  return { title: capitalize(format(month, 'LLLL yyyy', { locale: ru })), days: trimmed };
}

/** Дни недели по порядку пн–вс. weekOffset: 0 — текущая неделя */
export function getWeekDays(weekOffset = 0): WeekDay[] {
  const today = safeToday();
  const monday = addWeeks(startOfWeek(today, { weekStartsOn: 1 }), weekOffset);
  return Array.from({ length: 7 }).map((_, i) => {
    const day = addDays(monday, i);
    return {
      date: format(day, 'yyyy-MM-dd'),
      weekday: capitalize(format(day, 'EEEE', { locale: ru })),
      weekdayShort: weekdayShorts[day.getDay()],
      label: format(day, 'd MMMM', { locale: ru }),
      dayNumber: format(day, 'd'),
      monthShort: monthShorts[day.getMonth()],
      isToday: isSameDay(day, today),
      isPast: day < today && !isSameDay(day, today)
    };
  });
}

export function getCurrentWeek(weekOffset = 0): WeekDay[] {
  const today = safeToday();
  const monday = addWeeks(startOfWeek(today, { weekStartsOn: 1 }), weekOffset);

  const days: WeekDay[] = Array.from({ length: 7 }).map((_, i) => {
    const day = addDays(monday, i);
    const date = format(day, 'yyyy-MM-dd');
    return {
      date,
      weekday: capitalize(format(day, 'EEEE', { locale: ru })),
      weekdayShort: weekdayShorts[day.getDay()],
      label: format(day, 'd MMMM', { locale: ru }),
      dayNumber: format(day, 'd'),
      monthShort: monthShorts[day.getMonth()],
      isToday: isSameDay(day, today),
      isPast: day < today && !isSameDay(day, today)
    };
  });

  return [...days.filter((d) => !d.isPast), ...days.filter((d) => d.isPast)];
}

export function formatDateLabel(date?: string): string {
  if (!date) return 'Без даты';
  const parsed = parseISO(date);
  if (!isValid(parsed)) return 'Без даты';
  return `${capitalize(format(parsed, 'EEEE', { locale: ru }))}, ${format(parsed, 'd MMMM', {
    locale: ru
  })}`;
}