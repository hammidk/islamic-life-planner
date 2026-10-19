import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { periodMeta, prayerMeta } from '../data/appData';
import type { Period, Prayer } from '../types';

/** Конфигурация расчёта по умолчанию: 14 — Духовное управление мусульман России, 1 — ханафитский мазхаб */
export const PRAYER_METHOD = 14;
export const PRAYER_SCHOOL = 1;

export interface PrayerConfig {
  method: number;
  school: number;
}

export const DEFAULT_PRAYER_CONFIG: PrayerConfig = { method: PRAYER_METHOD, school: PRAYER_SCHOOL };

/** Методы расчёта (id Aladhan) */
export const PRAYER_METHODS: {id: number;label: string;short: string;}[] = [
{ id: 14, label: 'Духовное управление мусульман России', short: 'Духовное управление' },
{ id: 3, label: 'Мусульманская всемирная лига', short: 'Всемирная лига' },
{ id: 13, label: 'Диянет (Турция)', short: 'Диянет' },
{ id: 4, label: 'Умм аль-Кура (Мекка)', short: 'Умм аль-Кура' },
{ id: 2, label: 'ISNA (Северная Америка)', short: 'ISNA' },
{ id: 15, label: 'Moonsighting Committee', short: 'Moonsighting' }];


/** Правовая школа: влияет на время Асра */
export const PRAYER_SCHOOLS: {id: number;label: string;short: string;hint: string;}[] = [
{ id: 1, label: 'Ханафитский', short: 'Ханафитский', hint: 'Аср по тени ×2' },
{
  id: 0,
  label: 'Шафиитский, маликитский, ханбалитский',
  short: 'Шафиитский и др.',
  hint: 'Аср по тени ×1'
}];


export type WeatherIconKey =
'sun' |
'moon' |
'cloudSun' |
'cloud' |
'fog' |
'drizzle' |
'rain' |
'snow' |
'lightning';

export interface LiveWeather {
  /** «+8°C» */
  temp: string;
  state: string;
  icon: WeatherIconKey;
}

/** Подставляется вместо времени, пока данных нет */
export const TIME_PLACEHOLDER = '––:––';

export type LiveStatus = 'loading' | 'ready' | 'stale' | 'error';

export interface LiveLocation {
  city: string;
  lat: number;
  lon: number;
  tz: string;
  source: 'ip' | 'gps' | 'manual';
  confirmed: boolean;
}

export interface HijriDate {
  day: number;
  month: number;
  year: number;
}

/** Времена дня из API в формате HH:MM */
export interface DayTimings {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  lastthird: string;
  hijri?: HijriDate;
}

export type TimingKey = Exclude<keyof DayTimings, 'hijri'>;

export interface LiveSnapshot {
  location: LiveLocation | null;
  todayISO: string;
  minutes: number;
  todayLabel: string;
  todayFullLabel: string;
  hijriLabel: string;
  prayers: Prayer[];
  sunrise: string;
  tahajjud: {start: string;end: string;};
  periods: Period[];
  status: LiveStatus;
}

const hijriMonths = [
'мухаррама',
'сафара',
'раби аль-авваля',
'раби ас-сани',
'джумада аль-уля',
'джумада ас-сании',
'раджаба',
'шаабана',
'рамадана',
'шавваля',
'зуль-каада',
'зуль-хиджи'];


export const deviceTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

/** Дата (YYYY-MM-DD) и минуты суток в заданном часовом поясе */
export function clockIn(tz: string, date: Date = new Date()): {todayISO: string;minutes: number;} {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';
    const hour = Number(get('hour')) % 24;
    return {
      todayISO: `${get('year')}-${get('month')}-${get('day')}`,
      minutes: hour * 60 + Number(get('minute'))
    };
  } catch {
    return {
      todayISO: format(date, 'yyyy-MM-dd'),
      minutes: date.getHours() * 60 + date.getMinutes()
    };
  }
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function dayLabels(todayISO: string): {todayLabel: string;todayFullLabel: string;} {
  const d = parseISO(todayISO);
  const todayLabel = capitalize(format(d, 'EEEE, d MMMM', { locale: ru }));
  return { todayLabel, todayFullLabel: `${todayLabel} ${format(d, 'yyyy')}` };
}

/** Хиджра, посчитанная синхронно через Intl (умм аль-кура) */
export function intlHijri(tz: string, date: Date = new Date()): HijriDate | null {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
      timeZone: tz,
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    }).formatToParts(date);
    const num = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '', 10);
    const day = num('day');
    const month = num('month');
    const year = num('year');
    if (!day || !month || !year) return null;
    return { day, month, year };
  } catch {
    return null;
  }
}

export const formatHijri = (h: HijriDate | null): string =>
h && hijriMonths[h.month - 1] ? `${h.day} ${hijriMonths[h.month - 1]} ${h.year}` : '';

/** Собирает живой снимок из часов, места и (возможно, ещё не пришедших) времён */
export function buildSnapshot(input: {
  location: LiveLocation | null;
  todayISO: string;
  minutes: number;
  timings: DayTimings | null;
  status: LiveStatus;
}): LiveSnapshot {
  const { location, todayISO, minutes, timings, status } = input;
  const tz = location?.tz ?? deviceTimeZone();
  const t = (key: TimingKey) => timings?.[key] ?? TIME_PLACEHOLDER;

  const prayers: Prayer[] = prayerMeta.map((p) => ({ ...p, time: t(p.id) }));
  const byId = (id: string) => prayers.find((p) => p.id === id)?.time ?? TIME_PLACEHOLDER;
  const periods: Period[] = periodMeta.map(({ closedBy, ...p }) => ({
    ...p,
    endsAt: closedBy && timings ? byId(closedBy) : null
  }));

  return {
    location,
    todayISO,
    minutes,
    ...dayLabels(todayISO),
    hijriLabel: formatHijri(timings?.hijri ?? intlHijri(tz)),
    prayers,
    sunrise: t('sunrise'),
    tahajjud: { start: t('lastthird'), end: t('fajr') },
    periods,
    status
  };
}

const initialClock = clockIn(deviceTimeZone());
let snapshot: LiveSnapshot = buildSnapshot({
  location: null,
  ...initialClock,
  timings: null,
  status: 'loading'
});

/** Модульный снимок — для чистых функций в utils, которые не являются хуками */
export const getLive = (): LiveSnapshot => snapshot;

export const setLiveSnapshot = (next: LiveSnapshot): void => {
  snapshot = next;
};

/** Есть ли настоящие времена (а не заглушка) */
export const hasTimes = (s: LiveSnapshot = snapshot): boolean => s.status === 'ready' || s.status === 'stale';