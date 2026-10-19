import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart2Icon,
  CheckCircle2Icon,
  ClockIcon,
  PieChartIcon,
  TrophyIcon } from
'lucide-react';
import { Shell } from '../components/Shell';
import { IconButton } from '../components/IconButton';
import { ProfileButton } from '../components/ProfileButton';
import { useApp } from '../contexts/AppContext';
import { useLive } from '../contexts/LiveDataContext';

const prompts = [
{
  id: 'gratitude' as const,
  label: 'Благодарность',
  question: 'За что ты благодарен сегодня?'
},
{
  id: 'important' as const,
  label: 'Важное',
  question: 'Какие важные дела удалось сделать?'
},
{
  id: 'improve' as const,
  label: 'Улучшить',
  question: 'Что можно было сделать лучше?'
}];


export function Journal() {
  const navigate = useNavigate();
  const { saveJournal, journal } = useApp();
  const { todayLabel } = useLive();
  const { todayISO } = useLive();
  const today = journal.find((e) => e.date === todayISO);

  const [values, setValues] = useState({
    gratitude: today?.gratitude ?? '',
    important: today?.important ?? '',
    improve: today?.improve ?? ''
  });
  const [saved, setSaved] = useState(Boolean(today));

  const finish = () => {
    saveJournal(values);
    setSaved(true);
  };

  return (
    <Shell nav>
      <header className="flex items-start justify-between gap-3 pb-6 pt-3">
        <div>
          <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.015em] text-ink">
            Дневник
          </h1>
          <p className="mt-0.5 text-[13px] text-muted">{todayLabel}</p>
        </div>
        <div className="mt-0.5 flex shrink-0 items-center gap-1.5">
          <IconButton label="Записи" onClick={() => navigate('/journal/history')}>
            <ClockIcon className="h-[17px] w-[17px]" strokeWidth={1.8} aria-hidden="true" />
          </IconButton>
          <IconButton label="Цели и достижения" onClick={() => navigate('/journal/achievements')}>
            <TrophyIcon className="h-[17px] w-[17px]" strokeWidth={1.8} aria-hidden="true" />
          </IconButton>
          <IconButton label="Баланс сфер" onClick={() => navigate('/journal/balance')}>
            <PieChartIcon className="h-[17px] w-[17px]" strokeWidth={1.8} aria-hidden="true" />
          </IconButton>
          <IconButton label="Статистика дел" onClick={() => navigate('/tasks/stats')}>
            <BarChart2Icon className="h-[17px] w-[17px]" strokeWidth={1.8} aria-hidden="true" />
          </IconButton>
          <ProfileButton />
        </div>
      </header>

      <section aria-labelledby="finish-day">
        <h2 id="finish-day" className="text-[19px] font-semibold tracking-[-0.01em] text-ink">
          Завершение дня
        </h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
          Несколько спокойных минут, чтобы посмотреть на день честно и без счётчиков.
        </p>

        <div className="mt-6 space-y-4">
          {prompts.map((p) =>
          <label
            key={p.id}
            className="block rounded-card border border-line bg-surface px-4 py-4 shadow-card">
            
              <span className="text-[14.5px] font-medium text-ink">{p.label}</span>
              <span className="mt-0.5 block text-[13px] text-muted">{p.question}</span>
              <textarea
              value={values[p.id]}
              onChange={(e) => {
                setValues((v) => ({ ...v, [p.id]: e.target.value }));
                setSaved(false);
              }}
              rows={3}
              placeholder="Напиши своими словами…"
              className="mt-3 w-full resize-none bg-transparent text-[15px] leading-relaxed text-ink placeholder:text-muted/70 focus:outline-none" />
            
            </label>
          )}
        </div>

        {saved ?
        <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-primary-tint py-4 text-[14.5px] font-medium text-primary">
            <CheckCircle2Icon className="h-[17px] w-[17px]" strokeWidth={1.9} aria-hidden="true" />
            День завершён
          </div> :

        <button
          type="button"
          onClick={finish}
          className="mt-6 w-full rounded-2xl bg-primary py-4 text-[15.5px] font-medium text-white transition-transform duration-150 ease-out active:scale-[0.99]">
          
            Завершить день
          </button>
        }
      </section>
    </Shell>);

}