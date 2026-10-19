import React from 'react';
import { MapPinIcon } from 'lucide-react';
import { useLive } from '../contexts/LiveDataContext';

/** Пока место не подтверждено — тихая строка с возможностью поправить город */
export function LocationBanner() {
  const { location, locating, confirmLocation, openLocationPicker } = useLive();

  if (locating || location?.confirmed) return null;

  return (
    <div className="mb-3 flex items-center gap-2 rounded-card border border-line bg-surface py-2 pl-3.5 pr-2 shadow-card">
      <MapPinIcon className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.9} aria-hidden="true" />
      <p className="min-w-0 flex-1 truncate text-[13px] text-ink-soft">
        {location ?
        <>
            Показываем время для: <span className="font-medium text-ink">{location.city}</span>
          </> :

        'Выберите город для времён намазов'
        }
      </p>
      {location ?
      <button
        type="button"
        onClick={confirmLocation}
        className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-[12.5px] font-medium text-white transition-transform duration-150 ease-out active:scale-95">
        
          Верно
        </button> :
      null}
      <button
        type="button"
        onClick={openLocationPicker}
        className="shrink-0 rounded-full px-2.5 py-1.5 text-[12.5px] font-medium text-primary transition-colors duration-150 ease-out hover:bg-primary-tint">
        
        {location ? 'Изменить' : 'Выбрать'}
      </button>
    </div>);

}