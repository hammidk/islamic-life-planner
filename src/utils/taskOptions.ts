import {
  addDays,
  format,
  isSameDay,
  isSaturday,
  isSunday,
  isValid,
  nextMonday,
  nextSaturday,
  parseISO } from
'date-fns';
import { ru } from 'date-fns/locale';
import { todayISO } from './prayer';
import { spheres } from '../data/appData';
import type { Reminder, RepeatRule, Task } from '../types';

/** Ручной порядок внутри списка */
export const compareOrder = (a: Task, b: Task): number => (a.order ?? 0) - (b.order ?? 0);


const iso = (d: Date) => format(d, 'yyyy-MM-dd');

export function quickDates(): {id: string;label: string;date: string;hint: string;}[] {
  const today = safeParseISO(todayISO()) ?? new Date();
  const weekend = isSaturday(today) || isSunday(today) ? today : nextSaturday(today);
  const nextWeek = nextMonday(today);
  const hint = (d: Date) => format(d, 'EEEEEE, d MMM', { locale: ru });
  return [
  { id: 'today', label: 'Сегодня', date: iso(today), hint: hint(today) },
  { id: 'tomorrow', label: 'Завтра', date: iso(addDays(today, 1)), hint: hint(addDays(today, 1)) },
  { id: 'weekend', label: 'На этих выходных', date: iso(weekend), hint: hint(weekend) },
  { id: 'nextWeek', label: 'На следующей неделе', date: iso(nextWeek), hint: hint(nextWeek) }];

}

const monthShortRu = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

/** «Сб, 31 окт» */
export function formatShortDate(date: string): string {
  const d = safeParseISO(date);
  if (!d) return '';
  return `${weekdayShort[(d.getDay() + 6) % 7]}, ${d.getDate()} ${monthShortRu[d.getMonth()]}`;
}

/** «Суббота, 31 октября 2026 г.» */
export function formatFullDate(date: string): string {
  const d = safeParseISO(date);
  if (!d) return '';
  const text = format(d, "EEEE, d MMMM yyyy 'г.'", { locale: ru });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Строка даты над названием: «Сегодня», «Завтра, 10:00», «Сб, 31 окт, 10:00» */
export function formatDateLine(date: string, time?: string): string {
  const d = safeParseISO(date);
  if (!d) return '';
  const today = safeParseISO(todayISO());
  const day =
  today && isSameDay(d, today) ?
  'Сегодня' :
  today && isSameDay(d, addDays(today, 1)) ?
  'Завтра' :
  formatShortDate(date);
  return time ? `${day}, ${time}` : day;
}

/** Меню даты в карточке создания: ближайшие выходные и понедельник — строго после сегодня */
export function dateMenuOptions(): {id: string;label: string;date: string;}[] {
  const today = safeParseISO(todayISO()) ?? new Date();
  return [
  { id: 'today', label: 'Сегодня', date: iso(today) },
  { id: 'tomorrow', label: 'Завтра', date: iso(addDays(today, 1)) },
  { id: 'weekend', label: 'На следующих выходных', date: iso(nextSaturday(today)) },
  { id: 'nextWeek', label: 'На следующей неделе', date: iso(nextMonday(today)) }];

}

/** Безопасный разбор ISO-даты: null для пустой или невалидной строки */
export function safeParseISO(date?: string | null): Date | null {
  if (!date) return null;
  const d = parseISO(date);
  return isValid(d) ? d : null;
}

export function formatTaskDate(date?: string): string {
  const d = safeParseISO(date);
  if (!d) return 'Без даты';
  const today = safeParseISO(todayISO());
  if (today && isSameDay(d, today)) return 'Сегодня';
  if (today && isSameDay(d, addDays(today, 1))) return 'Завтра';
  return format(d, 'd MMM', { locale: ru });
}

/** «Вт 10:00» или «Вт» (без времени) перед названием — если у дела есть дата */
export function formatTimePrefix(task: Task): string | null {
  const d = safeParseISO(task.date);
  if (!d) return null;
  const day = weekdayShort[(d.getDay() + 6) % 7];
  return task.time ? `${day} ${task.time}` : day;
}

/**
 * Мета-строка задачи: «Сб · 17.10 · Каждый день · Вера».
 * День недели и время стоят перед названием (formatTimePrefix); у дела с временем они здесь не повторяются.
 * Без даты остаётся только сфера; при showDate=false — повтор и сфера.
 * withSphere=false — без сферы (её показывают отдельно, цветом сферы).
 * withDuration — длительность в мета-строке вместо отдельной подписи справа.
 */
export function formatRowMeta(
task: Task,
options: {showDate?: boolean;withSphere?: boolean;withDuration?: boolean;} = {})
: string {
  const showDate = options.showDate ?? true;
  const withSphere = options.withSphere ?? true;
  const sphereName = spheres.find((s) => s.id === task.sphere)?.name ?? 'Прочее';
  const d = safeParseISO(task.date);
  const parts: string[] = [];
  if (d) {
    if (showDate && !task.time) {
      parts.push(weekdayShort[(d.getDay() + 6) % 7], format(d, 'dd.MM'));
    }
    if (task.repeat && task.repeat.kind !== 'none') parts.push(formatRepeat(task.repeat));
  }
  if (options.withDuration && task.duration) parts.push(`${task.duration} мин`);
  if (withSphere) parts.push(sphereName);
  return parts.join(' · ');
}

export const absoluteReminders = [
{ time: '09:00', label: 'Утром' },
{ time: '12:00', label: 'В полдень' },
{ time: '15:00', label: 'Днём' },
{ time: '18:00', label: 'Вечером' },
{ time: '21:00', label: 'Ночью' }];


export const relativeReminders = [
{ minutes: 5, label: 'За 5 мин' },
{ minutes: 15, label: 'За 15 мин' },
{ minutes: 30, label: 'За 30 мин' },
{ minutes: 60, label: 'За 1 час' },
{ minutes: 120, label: 'За 2 часа' },
{ minutes: 1440, label: 'За 1 день' },
{ minutes: 2880, label: 'За 2 дня' },
{ minutes: 10080, label: 'За 1 неделю' },
{ minutes: 43200, label: 'За 1 месяц' }];


export function formatReminder(reminder?: Reminder): string {
  if (!reminder) return 'Без напоминания';
  if (reminder.kind === 'relative' && reminder.minutes === 0) return 'В момент события';
  if (reminder.kind === 'absolute') {
    const preset = absoluteReminders.find((r) => r.time === reminder.time);
    return preset ? `${preset.time} · ${preset.label}` : reminder.time;
  }
  const preset = relativeReminders.find((r) => r.minutes === reminder.minutes);
  return preset ? preset.label : `За ${reminder.minutes} мин`;
}

/** Тип напоминания зависит от точного времени: при смене времени несовместимое сбрасывается */
export function reminderAfterTimeChange(
reminder: Reminder | undefined,
time: string | undefined)
: Reminder | undefined {
  if (!reminder) return undefined;
  if (time && reminder.kind === 'absolute') return undefined;
  if (!time && reminder.kind === 'relative') return undefined;
  return reminder;
}

export const weekdayShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function formatRepeat(rule?: RepeatRule): string {
  if (!rule || rule.kind === 'none') return 'Не повторять';
  if (rule.kind === 'daily') return 'Каждый день';
  if (rule.kind === 'monthly') return 'Каждый месяц';
  if (rule.kind === 'weeks') return rule.every === 1 ? 'Каждую неделю' : `Каждые ${rule.every} нед.`;
  if (rule.days.length === 0) return 'Дни недели';
  return [...rule.days].
  sort((a, b) => a - b).
  map((d) => weekdayShort[d]).
  join(', ');
}