export type SphereId =
'faith' |
'family' |
'health' |
'rizq' |
'knowledge' |
'charity' |
'ideas' |
'other';

export interface Sphere {
  id: SphereId;
  name: string;
  color: string;
}

/** Периоды дня, ограниченные намазами */
export type PeriodId =
'untilDhuhr' |
'untilAsr' |
'untilMaghrib' |
'untilIsha' |
'afterIsha';

export interface Period {
  id: PeriodId;
  /** «Дела до Зухра» */
  label: string;
  /** Короткая форма для группировки в Плане: «До Зухра» */
  shortLabel: string;
  /** Время намаза, закрывающего период */
  endsAt: string | null;
}

export type TaskStatus = 'open' | 'done' | 'postponed' | 'cancelled';

/** Ценность поступка */
export type TaskValue = 'spiritual' | 'material' | 'moral' | 'humane';

/** Дополнительный пункт, прикреплённый к задаче или намазу */
export interface ChecklistItem {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  link?: string;
  /** YYYY-MM-DD; пусто — «без даты» */
  date?: string;
  time?: string;
  /** минуты; хранится только если задано пользователем (в расчётах — DEFAULT_DURATION) */
  duration?: number;
  notify?: boolean;
  sphere: SphereId;
  parentId?: string;
  /** окно намаза; вычисляется автоматически, в интерфейсе не выбирается */
  period: PeriodId;
  status: TaskStatus;
  /** «Зачем» */
  intention?: string;
  /** «Ожидаемый результат» */
  result?: string;
  /** устарело */
  value?: TaskValue;
  /** устарело: задачи с одинаковой группой можно выполнять одновременно */
  parallelGroup?: string;
  reminder?: Reminder;
  repeat?: RepeatRule;
  /** устарело */
  priority?: Priority;
  /** устарело */
  imageUrl?: string;
  /** устарело: «на сегодня» теперь — date = сегодня без времени */
  forToday?: boolean;
  /** раздел (проект) внутри сферы */
  sectionId?: string;
  /** ручной порядок внутри списка (меньше — выше) */
  order?: number;
  /** устарело */
  flagged?: boolean;
  /** устарело */
  tags?: string[];
  /** время отметки выполнения, «HH:MM» */
  completedAt?: string;
}

/** Раздел (проект) внутри сферы: Сфера → Раздел → Задача → Подзадача */
export interface Section {
  id: string;
  sphere: SphereId;
  title: string;
}

/** Абсолютное время (если у задачи нет точного времени) или заблаговременное */
export type Reminder =
{kind: 'absolute';time: string;} |
{kind: 'relative';minutes: number;};

export type RepeatRule =
{kind: 'none';} |
{kind: 'daily';} |
{kind: 'weekdays';days: number[];} |
{kind: 'weeks';every: number;} |
{kind: 'monthly';};

/** Матрица Эйзенхауэра */
export type Priority =
'urgentImportant' |
'urgentMinor' |
'notUrgentImportant' |
'notUrgentMinor';

export interface Habit {
  id: string;
  title: string;
  streak: number;
  bestStreak: number;
  doneToday: boolean;
  /** последние 28 дней, 1 — выполнено; последний элемент — день historyDate */
  history: number[];
  /** ISO-дата последней отметки (в часовом поясе пользователя) */
  doneDate?: string;
  /** ISO-дата, которой соответствует последний элемент history */
  historyDate?: string;
  description?: string;
  /** окно намаза; пусто — «без привязки» */
  windowId?: HabitWindowId;
  time?: string;
  duration?: number;
  /** запланированные дни: 0 = Пн … 6 = Вс; пусто — каждый день */
  daysOfWeek?: number[];
  end?: HabitEnd;
  /** «Зачем» */
  intention?: string;
  /** привычка завершена (по числу повторений или дате) */
  finished?: boolean;
  /** сколько раз отмечена всего */
  completedCount?: number;
}

export type HabitWindowId = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export type HabitEnd =
{kind: 'none';} |
{kind: 'count';count: number;} |
{kind: 'date';date: string;};

export interface Prayer {
  id: string;
  name: string;
  arabic: string;
  time: string;
  notify: boolean;
}

export interface Goal {
  id: string;
  title: string;
  sphere: SphereId;
  progress: number;
  taskIds: string[];
  horizon: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  label: string;
  gratitude: string;
  important: string;
  improve: string;
}