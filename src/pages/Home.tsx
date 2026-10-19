import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ListTodoIcon } from 'lucide-react';
import { WeatherIcon } from '../components/WeatherIcon';
import { Shell } from '../components/Shell';
import { PrayerTimeline } from '../components/PrayerTimeline';
import { SphereIcon } from '../components/SphereIcon';
import { LocationBanner } from '../components/LocationBanner';
import { WeekSwiper } from '../components/WeekSwiper';
import { ProfileButton } from '../components/ProfileButton';
import { useApp } from '../contexts/AppContext';
import { useLive } from '../contexts/LiveDataContext';
import { spheres } from '../data/appData';
import { fromMinutes } from '../utils/prayer';

/** «1 дело», «3 дела», «5 дел» */
const tasksWord = (count: number): string => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'дело';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дела';
  return 'дел';
};

export function Home() {
  const navigate = useNavigate();
  const { tasks } = useApp();
  const { minutes, todayISO, todayFullLabel, hijriLabel, weather } = useLive();

  const open = tasks.filter((t) => t.status === 'open');
  const todayOpen = open.filter((t) => t.date === todayISO);

  return (
    <Shell nav>
      <header className="flex items-center justify-end gap-2 pb-5 pt-2">
        <ProfileButton />
      </header>

      <LocationBanner />
      <PrayerTimeline />

      <button
        type="button"
        onClick={() => navigate('/today')}
        className="mt-4 flex w-full items-center gap-3 rounded-card bg-primary px-4 py-4 text-left text-white shadow-[0_6px_18px_rgba(31,90,68,0.18)] transition-transform duration-150 ease-out active:scale-[0.99]">
        
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
          <ListTodoIcon className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-semibold tracking-[-0.01em]">Сегодня</span>
          <span className="mt-0.5 block text-[12.5px] leading-snug text-white/80">
            <span className="tabular-nums">{todayOpen.length}</span> {tasksWord(todayOpen.length)}{' '}
            осталось
          </span>
        </span>
        <span className="min-w-0 max-w-[55%] shrink-0 text-right">
          <span className="block truncate text-[11.5px] leading-tight text-white/75">{todayFullLabel}</span>
          {hijriLabel ?
          <span className="mt-0.5 block truncate text-[11.5px] leading-tight text-white/60">
              {hijriLabel}
            </span> :
          null}
          <span className="mt-1.5 block text-[20px] font-semibold leading-none tabular-nums text-white">
            {fromMinutes(minutes)}
          </span>
          <span className="mt-1.5 flex min-w-0 items-center justify-end gap-1 whitespace-nowrap text-[12px] font-medium text-white/90">
            {weather ?
            <>
                <WeatherIcon icon={weather.icon} className="h-[13px] w-[13px] shrink-0" />
                <span className="truncate">
                  {weather.temp} · {weather.state}
                </span>
              </> :

            '—'
            }
          </span>
        </span>
      </button>

      <section aria-labelledby="spheres-title" className="mt-7">
        <h2
          id="spheres-title"
          className="mb-2 px-1 text-[13px] font-medium uppercase tracking-[0.08em] text-muted">
          
          Сферы жизни
        </h2>
        <ul className="grid grid-cols-3 gap-2">
          {spheres.map((sphere) => {
            const count = open.filter((t) => t.sphere === sphere.id).length;
            return (
              <li key={sphere.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/sphere/${sphere.id}`)}
                  aria-label={`${sphere.name}${count > 0 ? `, дел: ${count}` : ''}`}
                  className="flex h-full w-full flex-col gap-3 rounded-card border border-line bg-surface px-3 py-3 text-left shadow-card transition-colors duration-150 ease-out hover:border-primary/40">
                  
                  <span className="flex w-full items-center justify-between">
                    <SphereIcon id={sphere.id} color={sphere.color} className="h-[18px] w-[18px]" />
                    <span className="text-[13.5px] tabular-nums text-muted">
                      {count > 0 ? count : ''}
                    </span>
                  </span>
                  <span className="text-[13.5px] leading-tight text-ink">{sphere.name}</span>
                </button>
              </li>);

          })}
        </ul>
      </section>

      <WeekSwiper />
    </Shell>);

}