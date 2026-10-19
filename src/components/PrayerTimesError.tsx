import React from 'react';
import { RotateCwIcon } from 'lucide-react';
import { useLive } from '../contexts/LiveDataContext';

/** Спокойная карточка, когда времён намазов нет ни из сети, ни из кэша */
export function PrayerTimesError() {
  const { retry } = useLive();
  return (
    <div className="flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3.5 shadow-card">
      <p className="min-w-0 flex-1 text-[14px] leading-snug text-ink-soft">
        Не удалось получить времена намазов
      </p>
      <button
        type="button"
        onClick={retry}
        className="flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[13px] font-medium text-primary transition-colors duration-150 ease-out hover:border-primary/40">
        
        <RotateCwIcon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        Повторить
      </button>
    </div>);

}