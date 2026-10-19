import { getLive } from './live';
import type { PeriodId, Prayer } from '../types';

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
