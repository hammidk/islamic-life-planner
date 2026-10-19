import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LocationSheet } from '../components/LocationSheet';
import { buildSnapshot, clockIn, deviceTimeZone, setLiveSnapshot } from '../utils/live';
import type {
  DayTimings,
  LiveLocation,
  LiveSnapshot,
  LiveStatus,
  LiveWeather,
  PrayerConfig } from
'../utils/live';
import {
  fetchTimings,
  fetchWeather,
  loadLocation,
  loadPrayerConfig,
  locateByIp,
  readCachedTimings,
  readCachedWeather,
  readLastTimings,
  saveLocation,
  savePrayerConfig } from
'../utils/liveApi';

interface LiveState extends LiveSnapshot {
  /** идёт определение города по IP */
  locating: boolean;
  /** null — данных о погоде пока нет */
  weather: LiveWeather | null;
  prayerConfig: PrayerConfig;
  setPrayerConfig: (patch: Partial<PrayerConfig>) => void;
  setLocation: (location: LiveLocation) => void;
  confirmLocation: () => void;
  openLocationPicker: () => void;
  /** повторить запрос времён намазов */
  retry: () => void;
}

const LiveDataContext = createContext<LiveState | null>(null);

const TICK_MS = 30000;

export function LiveDataProvider({ children }: {children: React.ReactNode;}) {
  const [location, setLocationState] = useState<LiveLocation | null>(() => loadLocation());
  const tz = location?.tz ?? deviceTimeZone();
  const [clock, setClock] = useState(() => clockIn(tz));
  const [timings, setTimings] = useState<DayTimings | null>(null);
  const [status, setStatus] = useState<LiveStatus>('loading');
  const [locating, setLocating] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [prayerConfig, setPrayerConfigState] = useState<PrayerConfig>(() => loadPrayerConfig());
  const [weather, setWeather] = useState<LiveWeather | null>(null);

  /* часы: каждые 30 с в часовом поясе места; смена даты в полночь подхватывается автоматически */
  useEffect(() => {
    const tick = () =>
    setClock((prev) => {
      const next = clockIn(tz);
      return prev.todayISO === next.todayISO && prev.minutes === next.minutes ? prev : next;
    });
    tick();
    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
  }, [tz]);

  /* первый запуск: город по IP без запроса разрешений */
  useEffect(() => {
    if (location) return;
    let cancelled = false;
    setLocating(true);
    locateByIp().then((found) => {
      if (cancelled) return;
      setLocating(false);
      if (found) {
        setLocationState(found);
        saveLocation(found);
      } else {
        setPickerOpen(true);
      }
    });
    return () => {
      cancelled = true;
    };
    // запускается только при отсутствии сохранённого места
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lat = location?.lat;
  const lon = location?.lon;
  const locTz = location?.tz;
  const { todayISO } = clock;
  const { method, school } = prayerConfig;

  /* погода: кэш на 30 минут, обновление раз в 30 минут и при смене места */
  useEffect(() => {
    if (lat === undefined || lon === undefined) return;
    let cancelled = false;
    const load = () => {
      const cached = readCachedWeather(lat, lon);
      if (cached) {
        setWeather(cached);
        return;
      }
      fetchWeather(lat, lon).
      then((w) => {
        if (!cancelled) setWeather(w);
      }).
      catch(() => {

        /* остаётся последнее известное значение или «—» */});
    };
    setWeather(readCachedWeather(lat, lon));
    load();
    const id = window.setInterval(load, 30 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [lat, lon]);

  /* времена намазов: кэш на сегодня → сеть → последний известный день («приблизительно») */
  useEffect(() => {
    if (lat === undefined || lon === undefined || !locTz) return;
    const cfg = { method, school };
    const cached = readCachedTimings(todayISO, lat, lon, cfg);
    if (cached) {
      setTimings(cached);
      setStatus('ready');
      return;
    }
    let cancelled = false;
    setTimings(null);
    setStatus('loading');
    fetchTimings(todayISO, { lat, lon, tz: locTz }, cfg).
    then((result) => {
      if (cancelled) return;
      setTimings(result);
      setStatus('ready');
    }).
    catch(() => {
      if (cancelled) return;
      const last = readLastTimings(lat, lon, cfg);
      if (last) {
        // хиджра из другого дня не подходит — её посчитает Intl
        setTimings({ ...last, hijri: undefined });
        setStatus('stale');
      } else {
        setTimings(null);
        setStatus('error');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [lat, lon, locTz, todayISO, reloadKey, method, school]);

  const setPrayerConfig = useCallback((patch: Partial<PrayerConfig>) => {
    setPrayerConfigState((prev) => {
      const next = { ...prev, ...patch };
      savePrayerConfig(next);
      return next;
    });
  }, []);

  const setLocation = useCallback((next: LiveLocation) => {
    setLocationState(next);
    saveLocation(next);
    setPickerOpen(false);
  }, []);

  const confirmLocation = useCallback(() => {
    setLocationState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, confirmed: true };
      saveLocation(next);
      return next;
    });
  }, []);

  const openLocationPicker = useCallback(() => setPickerOpen(true), []);
  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  const snapshot = useMemo(
    () =>
    buildSnapshot({
      location,
      todayISO: clock.todayISO,
      minutes: clock.minutes,
      timings,
      status
    }),
    [location, clock, timings, status]
  );
  // синхронно обновляем модульный снимок до рендера детей — его читают чистые функции в utils
  setLiveSnapshot(snapshot);

  const value: LiveState = {
    ...snapshot,
    locating,
    weather,
    prayerConfig,
    setPrayerConfig,
    setLocation,
    confirmLocation,
    openLocationPicker,
    retry
  };

  return (
    <LiveDataContext.Provider value={value}>
      {children}
      <LocationSheet open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </LiveDataContext.Provider>);

}

export function useLive(): LiveState {
  const ctx = useContext(LiveDataContext);
  if (!ctx) throw new Error('useLive must be used within LiveDataProvider');
  return ctx;
}