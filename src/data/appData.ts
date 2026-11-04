import type {
  ChecklistItem,
  Goal,
  Habit,
  JournalEntry,
  Period,
  Prayer,
  Task } from
'../types';

export type ObligatoryPrayerId = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

/**
 * Пять обязательных намазов — опорные точки дня.
 * Время приходит из живых данных (contexts/LiveDataContext), здесь — только названия и порядок.
 */
export const prayerMeta: (Omit<Prayer, 'time'> & {id: ObligatoryPrayerId;})[] = [
{ id: 'fajr', name: 'Фаджр', arabic: 'الفجر', notify: true },
{ id: 'dhuhr', name: 'Зухр', arabic: 'الظهر', notify: true },
{ id: 'asr', name: 'Аср', arabic: 'العصر', notify: true },
{ id: 'maghrib', name: 'Магриб', arabic: 'المغرب', notify: true },
{ id: 'isha', name: 'Иша', arabic: 'العشاء', notify: false }];


/** Периоды дня; время окончания (endsAt) считается из живых времён намазов */
export const periodMeta: (Omit<Period, 'endsAt'> & {closedBy: ObligatoryPrayerId | null;})[] = [
{ id: 'untilDhuhr', label: 'Дела до Зухра', shortLabel: 'До Зухра', closedBy: 'dhuhr' },
{ id: 'untilAsr', label: 'Дела до Асра', shortLabel: 'До Асра', closedBy: 'asr' },
{ id: 'untilMaghrib', label: 'Дела до Магриба', shortLabel: 'До Магриба', closedBy: 'maghrib' },
{ id: 'untilIsha', label: 'Дела до Иша', shortLabel: 'До Иша', closedBy: 'isha' },
{ id: 'afterIsha', label: 'Дела после Иша', shortLabel: 'После Иша', closedBy: null }];


export const inspiration = {
  text: 'Ищи в том, что даровал тебе Аллах, обитель вечную и не забывай своей доли в этом мире.',
  source: 'Сура «Аль-Касас», 77'
};

/** Демонстрационные задачи очищены — пользователь начинает с чистого дня */
export const initialTasks: Task[] = [];

export const initialGoals: Goal[] = [];

/** Пункты, прикреплённые к задачам и намазам (ключ — id задачи или намаза) */
export const initialChecklists: Record<string, ChecklistItem[]> = {};

/** Привычки создаёт только пользователь */
export const initialHabits: Habit[] = [];

/** Записи дневника создаёт только пользователь */
export const initialJournal: JournalEntry[] = [];

export interface Achievement {
  id: string;
  title: string;
  note: string;
  date: string;
}

export const achievements: Achievement[] = [];