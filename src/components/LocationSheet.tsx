import React, { useEffect, useState } from 'react';
import { LoaderIcon, LocateFixedIcon, MapPinIcon, SearchIcon } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { SheetOption } from './task/SheetOption';
import { useLive } from '../contexts/LiveDataContext';
import { deviceTimeZone } from '../utils/live';
import { reverseGeocode, searchCities } from '../utils/liveApi';
import type { CityResult } from '../utils/liveApi';

interface LocationSheetProps {
  open: boolean;
  onClose: () => void;
}

type SearchState = 'idle' | 'loading' | 'done' | 'error';

/** Выбор города для расчёта намазов: GPS по нажатию или поиск по названию */
export function LocationSheet({ open, onClose }: LocationSheetProps) {
  const { location, setLocation } = useLive();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CityResult[]>([]);
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setResults([]);
    setSearchState('idle');
    setGpsError(null);
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearchState('idle');
      return;
    }
    let cancelled = false;
    setSearchState('loading');
    const timer = window.setTimeout(() => {
      searchCities(q).
      then((list) => {
        if (cancelled) return;
        setResults(list);
        setSearchState('done');
      }).
      catch(() => {
        if (!cancelled) setSearchState('error');
      });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const locateWithGps = () => {
    setGpsError(null);
    if (!('geolocation' in navigator)) {
      setGpsError('Это устройство не поддерживает определение местоположения. Выберите город вручную.');
      return;
    }
    setGpsBusy(true);
    try {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          const city = await reverseGeocode(latitude, longitude);
          setGpsBusy(false);
          setLocation({
            city,
            lat: latitude,
            lon: longitude,
            tz: deviceTimeZone(),
            source: 'gps',
            confirmed: true
          });
        },
        (err) => {
          setGpsBusy(false);
          if (err.code === err.PERMISSION_DENIED) {
            setGpsError('Доступ к геолокации запрещён. Разрешите его в настройках браузера или найдите город ниже.');
          } else if (err.code === err.TIMEOUT) {
            setGpsError('Не удалось определить местоположение вовремя. Попробуйте ещё раз или найдите город ниже.');
          } else {
            setGpsError('Местоположение сейчас недоступно. Найдите город ниже.');
          }
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
      );
    } catch {
      setGpsBusy(false);
      setGpsError('Местоположение сейчас недоступно. Найдите город ниже.');
    }
  };

  return (
    <BottomSheet open={open} title="Местоположение" onClose={onClose}>
      {location ?
      <p className="-mt-2 mb-4 flex items-center gap-1.5 text-[13px] text-muted">
          <MapPinIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} aria-hidden="true" />
          <span className="truncate">Сейчас: {location.city}</span>
        </p> :

      <p className="-mt-2 mb-4 text-[13px] leading-relaxed text-muted">
          Не удалось определить город автоматически. Выберите его, чтобы рассчитать времена намазов.
        </p>
      }

      <button
        type="button"
        onClick={locateWithGps}
        disabled={gpsBusy}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary-tint py-3 text-[14.5px] font-medium text-primary transition-colors duration-150 ease-out hover:border-primary/50 disabled:opacity-60">
        
        {gpsBusy ?
        <LoaderIcon className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden="true" /> :

        <LocateFixedIcon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        }
        {gpsBusy ? 'Определяем…' : 'Определить по GPS'}
      </button>
      {gpsError ?
      <p role="alert" className="mt-2 text-[13px] leading-relaxed text-[#A44A3F]">
          {gpsError}
        </p> :
      null}

      <label className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-canvas px-3 py-2.5 focus-within:border-primary/50">
        <SearchIcon className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.9} aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Найти город"
          aria-label="Найти город"
          className="min-w-0 flex-1 bg-transparent text-[16px] text-ink placeholder:text-muted/80 focus:outline-none" />
        
      </label>

      <div className="-mx-3 mt-2 min-h-[48px]">
        {searchState === 'loading' ?
        <p className="px-3 py-3 text-[13.5px] text-muted">Ищем…</p> :
        searchState === 'error' ?
        <p className="px-3 py-3 text-[13.5px] text-muted">
            Поиск сейчас недоступен. Проверьте соединение и попробуйте ещё раз.
          </p> :
        searchState === 'done' && results.length === 0 ?
        <p className="px-3 py-3 text-[13.5px] text-muted">Ничего не нашлось.</p> :

        results.map((r) =>
        <SheetOption
          key={r.id}
          label={r.label}
          selected={
          Boolean(location) &&
          Math.abs((location?.lat ?? 0) - r.lat) < 0.01 &&
          Math.abs((location?.lon ?? 0) - r.lon) < 0.01
          }
          onClick={() =>
          setLocation({
            city: r.name,
            lat: r.lat,
            lon: r.lon,
            tz: r.tz,
            source: 'manual',
            confirmed: true
          })
          } />

        )
        }
      </div>
    </BottomSheet>);

}