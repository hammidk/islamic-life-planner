import React from 'react';
import { PrayerTimesError } from './PrayerTimesError';
import { useLive } from '../contexts/LiveDataContext';
import { formatDuration, getPrayerState } from '../utils/prayer';

const genitive: Record<string, string> = {
  Фаджр: 'Фаджра',
  Зухр: 'Зухра',
  Аср: 'Асра',
  Магриб: 'Магриба',
  Иша: 'Иша'
};

export function PrayerTimeline() {
  const { prayers, sunrise, tahajjud, minutes, status } = useLive();

  if (status === 'error') return <PrayerTimesError />;

  const ready = status === 'ready' || status === 'stale';
  const { current, next, until } = getPrayerState(minutes);

  /** Порядок как в интерфейсе: обязательные намазы + Восход и Тахаджуд (только для отображения) */
  const marks = [
  ...prayers.slice(0, 1).map((p) => ({ id: p.id, name: p.name, time: p.time })),
  { id: 'sunrise', name: 'Восход', time: sunrise },
  ...prayers.slice(1).map((p) => ({ id: p.id, name: p.name, time: p.time })),
  { id: 'tahajjud', name: 'Тахаджуд', time: tahajjud.start }];


  return (
    <section
      aria-label="Времена намазов"
      aria-busy={!ready}
      className="rounded-card border border-line bg-surface px-3 py-3 shadow-card">
      
      <div className="grid grid-cols-7 gap-[2px]">
        {marks.map((mark) => {
          const isCurrent = ready && mark.id === current.id;
          const isNext = ready && mark.id === next.id;
          return (
            <div
              key={mark.id}
              className={`flex min-w-0 flex-col items-center gap-0.5 rounded-lg px-0.5 py-1.5 ${
              isCurrent ? 'bg-primary-tint' : ''}`
              }>
              
              <span
                className={`whitespace-nowrap text-[9.5px] tracking-[-0.01em] ${
                isCurrent ?
                'font-medium text-primary' :
                isNext ?
                'text-ink-soft' :
                'text-muted'}`
                }>
                
                {mark.name}
              </span>
              <span
                className={`text-[11.5px] tabular-nums ${
                isCurrent ?
                'font-semibold text-primary' :
                isNext ?
                'font-medium text-ink' :
                ready ?
                'text-ink-soft' :
                'text-muted/70'}`
                }>
                
                {mark.time}
              </span>
              <span
                className={`mt-1 h-[4px] w-[4px] rounded-full ${
                isCurrent ? 'bg-primary' : isNext ? 'bg-primary/40' : 'bg-line'}`
                }
                aria-hidden="true" />
              
            </div>);

        })}
      </div>

      <p className="mt-2 border-t border-line pt-2.5 text-center text-[13px] text-muted">
        {ready ?
        <>
            Через{' '}
            <span className="font-medium text-primary">{formatDuration(Math.max(1, until))}</span>{' '}
            до {genitive[next.name] ?? next.name}
            <span className="tabular-nums"> · {next.time}</span>
          </> :

        'Определяем времена намазов…'
        }
      </p>
      {status === 'stale' ?
      <p className="mt-0.5 text-center text-[11px] text-muted/80">приблизительно</p> :
      null}
    </section>);

}