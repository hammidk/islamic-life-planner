import { DEFAULT_PRAYER_CONFIG, PRAYER_METHODS, PRAYER_SCHOOLS, deviceTimeZone } from './live';
import type { DayTimings, LiveLocation, LiveWeather, PrayerConfig, WeatherIconKey } from './live';

const LOCATION_KEY = 'sirahdo.location';
const CONFIG_KEY = 'sirahdo.prayerConfig';
const WEATHER_KEY = 'sirahdo.weather';
const WEATHER_TTL = 30 * 60 * 1000;
const TIMINGS_PREFIX = 'sirahdo.prayers|';
const LAST_PREFIX = 'sirahdo.prayers.last|';

/* ---------- localStorage ---------- */

function readJSON<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {

    /* хранилище недоступно — работаем без кэша */}
}

export function loadLocation(): LiveLocation | null {
  const saved = readJSON<LiveLocation>(LOCATION_KEY);
  if (
  saved &&
  typeof saved.lat === 'number' &&
  typeof saved.lon === 'number' &&
  typeof saved.tz === 'string' &&
  typeof saved.city === 'string')
  {
    return saved;
  }
  return null;
}

export const saveLocation = (location: LiveLocation): void => writeJSON(LOCATION_KEY, location);

export function loadPrayerConfig(): PrayerConfig {
  const saved = readJSON<PrayerConfig>(CONFIG_KEY);
  const method = PRAYER_METHODS.some((m) => m.id === saved?.method) ?
  (saved as PrayerConfig).method :
  DEFAULT_PRAYER_CONFIG.method;
  const school = PRAYER_SCHOOLS.some((s) => s.id === saved?.school) ?
  (saved as PrayerConfig).school :
  DEFAULT_PRAYER_CONFIG.school;
  return { method, school };
}

export const savePrayerConfig = (config: PrayerConfig): void => writeJSON(CONFIG_KEY, config);

const placeKey = (lat: number, lon: number, cfg: PrayerConfig) =>
`${lat.toFixed(2)}|${lon.toFixed(2)}|${cfg.method}|${cfg.school}`;

/** Ключ кэша: «дата|lat|lon|method|school» */
export const timingsKey = (dateISO: string, lat: number, lon: number, cfg: PrayerConfig) =>
`${dateISO}|${placeKey(lat, lon, cfg)}`;

export function readCachedTimings(
dateISO: string,
lat: number,
lon: number,
cfg: PrayerConfig)
: DayTimings | null {
  return readJSON<DayTimings>(TIMINGS_PREFIX + timingsKey(dateISO, lat, lon, cfg));
}

/** Последний известный день для этого места — для режима «приблизительно» */
export function readLastTimings(lat: number, lon: number, cfg: PrayerConfig): DayTimings | null {
  return readJSON<DayTimings>(LAST_PREFIX + placeKey(lat, lon, cfg));
}

function cacheTimings(
dateISO: string,
lat: number,
lon: number,
cfg: PrayerConfig,
timings: DayTimings)
: void {
  writeJSON(TIMINGS_PREFIX + timingsKey(dateISO, lat, lon, cfg), timings);
  writeJSON(LAST_PREFIX + placeKey(lat, lon, cfg), timings);
}

/* ---------- сеть ---------- */

async function getJSON(url: string, timeoutMs = 9000): Promise<unknown> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    window.clearTimeout(timer);
  }
}

type Json = Record<string, unknown>;
const asObj = (v: unknown): Json => v && typeof v === 'object' ? v as Json : {};
const asNum = (v: unknown): number | null => {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
};
const asStr = (v: unknown): string => typeof v === 'string' ? v : '';

/** Город по IP без запроса разрешений: ipwho.is → ipapi.co */
export async function locateByIp(): Promise<LiveLocation | null> {
  try {
    const d = asObj(await getJSON('https://ipwho.is/'));
    const lat = asNum(d.latitude);
    const lon = asNum(d.longitude);
    const tz = asStr(asObj(d.timezone).id);
    if (d.success !== false && lat !== null && lon !== null) {
      return {
        city: asStr(d.city) || 'Моё местоположение',
        lat,
        lon,
        tz: tz || deviceTimeZone(),
        source: 'ip',
        confirmed: false
      };
    }
  } catch {

    /* пробуем запасной источник */}
  try {
    const d = asObj(await getJSON('https://ipapi.co/json/'));
    const lat = asNum(d.latitude);
    const lon = asNum(d.longitude);
    if (!d.error && lat !== null && lon !== null) {
      return {
        city: asStr(d.city) || 'Моё местоположение',
        lat,
        lon,
        tz: asStr(d.timezone) || deviceTimeZone(),
        source: 'ip',
        confirmed: false
      };
    }
  } catch {

    /* оба источника недоступны */}
  return null;
}

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const d = asObj(
      await getJSON(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ru`
      )
    );
    return asStr(d.city) || asStr(d.locality) || asStr(d.principalSubdivision) || 'Моё местоположение';
  } catch {
    return 'Моё местоположение';
  }
}

export interface CityResult {
  id: string;
  label: string;
  name: string;
  lat: number;
  lon: number;
  tz: string;
}

export async function searchCities(query: string): Promise<CityResult[]> {
  const d = asObj(
    await getJSON(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        query
      )}&count=8&language=ru&format=json`
    )
  );
  const results = Array.isArray(d.results) ? d.results : [];
  return results.
  map((r, i): CityResult | null => {
    const o = asObj(r);
    const lat = asNum(o.latitude);
    const lon = asNum(o.longitude);
    const name = asStr(o.name);
    if (lat === null || lon === null || !name) return null;
    const label = [name, asStr(o.admin1), asStr(o.country)].filter(Boolean).join(', ');
    return {
      id: `${asStr(String(o.id ?? i))}-${lat}-${lon}`,
      label,
      name,
      lat,
      lon,
      tz: asStr(o.timezone) || deviceTimeZone()
    };
  }).
  filter((r): r is CityResult => r !== null);
}

/** «04:15 (MSK)» → «04:15» */
const cleanTime = (v: unknown): string | null => {
  const m = asStr(v).match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null;
};

/** Времена намазов на дату; ответ кэшируется */
export async function fetchTimings(
dateISO: string,
location: Pick<LiveLocation, 'lat' | 'lon' | 'tz'>,
cfg: PrayerConfig)
: Promise<DayTimings> {
  const [y, m, d] = dateISO.split('-');
  const url =
  `https://api.aladhan.com/v1/timings/${d}-${m}-${y}` +
  `?latitude=${location.lat}&longitude=${location.lon}` +
  `&method=${cfg.method}&school=${cfg.school}` +
  `&timezonestring=${encodeURIComponent(location.tz)}`;
  const data = asObj(asObj(await getJSON(url)).data);
  const t = asObj(data.timings);

  const fields = {
    fajr: cleanTime(t.Fajr),
    sunrise: cleanTime(t.Sunrise),
    dhuhr: cleanTime(t.Dhuhr),
    asr: cleanTime(t.Asr),
    maghrib: cleanTime(t.Maghrib),
    isha: cleanTime(t.Isha),
    lastthird: cleanTime(t.Lastthird)
  };
  if (Object.values(fields).some((v) => v === null)) throw new Error('Неполный ответ API');

  const h = asObj(asObj(data.date).hijri);
  const hDay = asNum(h.day);
  const hMonth = asNum(asObj(h.month).number);
  const hYear = asNum(h.year);

  const timings: DayTimings = {
    ...(fields as Record<keyof typeof fields, string>),
    hijri: hDay && hMonth && hYear ? { day: hDay, month: hMonth, year: hYear } : undefined
  };
  cacheTimings(dateISO, location.lat, location.lon, cfg, timings);
  return timings;
}

/* ---------- погода ---------- */

function describeWeather(code: number, isDay: boolean): {state: string;icon: WeatherIconKey;} {
  if (code === 0) return { state: 'Ясно', icon: isDay ? 'sun' : 'moon' };
  if (code === 1) return { state: 'Преимущественно ясно', icon: isDay ? 'sun' : 'moon' };
  if (code === 2) return { state: 'Переменная облачность', icon: 'cloudSun' };
  if (code === 3) return { state: 'Пасмурно', icon: 'cloud' };
  if (code === 45 || code === 48) return { state: 'Туман', icon: 'fog' };
  if (code >= 51 && code <= 57) return { state: 'Морось', icon: 'drizzle' };
  if (code >= 61 && code <= 67) return { state: 'Дождь', icon: 'rain' };
  if (code >= 71 && code <= 77) return { state: 'Снег', icon: 'snow' };
  if (code >= 80 && code <= 82) return { state: 'Ливни', icon: 'rain' };
  if (code === 85 || code === 86) return { state: 'Снегопад', icon: 'snow' };
  if (code >= 95 && code <= 99) return { state: 'Гроза', icon: 'lightning' };
  return { state: 'Облачно', icon: 'cloud' };
}

const weatherPlace = (lat: number, lon: number) => `${lat.toFixed(2)}|${lon.toFixed(2)}`;

interface CachedWeather {
  place: string;
  at: number;
  weather: LiveWeather;
}

/** Свежая (до 30 минут) погода из кэша для этого места */
export function readCachedWeather(lat: number, lon: number): LiveWeather | null {
  const cached = readJSON<CachedWeather>(WEATHER_KEY);
  if (!cached || cached.place !== weatherPlace(lat, lon)) return null;
  return Date.now() - cached.at < WEATHER_TTL ? cached.weather : null;
}

export async function fetchWeather(lat: number, lon: number): Promise<LiveWeather> {
  const d = asObj(
    await getJSON(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`
    )
  );
  const current = asObj(d.current);
  const temp = asNum(current.temperature_2m);
  const code = asNum(current.weather_code);
  if (temp === null || code === null) throw new Error('Неполный ответ погоды');
  const rounded = Math.round(temp);
  const weather: LiveWeather = {
    temp: `${rounded > 0 ? '+' : ''}${rounded}°C`,
    ...describeWeather(code, asNum(current.is_day) !== 0)
  };
  writeJSON(WEATHER_KEY, { place: weatherPlace(lat, lon), at: Date.now(), weather });
  return weather;
}