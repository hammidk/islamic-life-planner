import React, { useState } from 'react';
import { ZapIcon } from 'lucide-react';
import { Shell, SubHeader } from '../components/Shell';
import { useApp } from '../contexts/AppContext';

export function HabitStats() {
  const { habits } = useApp();
  const [selectedId, setSelectedId] = useState(habits[0]?.id ?? '');
  const habit = habits.find((h) => h.id === selectedId) ?? habits[0];

  if (!habit) {
    return (
      <Shell>
        <SubHeader title="Статистика привычек" />
        <p className="px-1 text-[14px] leading-relaxed text-muted">
          Пока нет привычек. Добавьте первую — и здесь появится её постоянство.
        </p>
      </Shell>);

  }

  const weekly = habit.history.slice(-7).filter(Boolean).length;
  const monthly = habit.history.filter(Boolean).length;
  const consistency = Math.round(monthly / Math.max(1, habit.history.length) * 100);

  return (
    <Shell>
      <SubHeader title="Статистика привычек" subtitle="Постоянство, а не рекорды" />

      <div className="no-scrollbar -mx-5 mb-5 flex gap-2 overflow-x-auto px-5">
        {habits.map((h) =>
        <button
          key={h.id}
          type="button"
          onClick={() => setSelectedId(h.id)}
          aria-pressed={h.id === habit.id}
          className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-[13.5px] transition-colors duration-150 ease-out ${
          h.id === habit.id ?
          'border-primary/50 bg-primary-tint text-primary' :
          'border-line bg-surface text-ink-soft'}`
          }>
          
            {h.title}
          </button>
        )}
      </div>

      <div className="rounded-card border border-line bg-surface px-4 py-4 shadow-card">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">{habit.title}</h2>
          <span className="flex items-center gap-1 text-[14px] font-medium text-primary">
            <ZapIcon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            {habit.streak}
          </span>
        </div>
        <p className="mt-1 text-[13px] text-muted">Постоянство за 4 недели · {consistency}%</p>
        {habit.intention ?
        <p className="mt-3 rounded-xl bg-primary-tint/60 px-3 py-2.5 text-[13.5px] leading-relaxed text-ink-soft">
            <span className="font-medium text-primary">Зачем: </span>
            {habit.intention}
          </p> :
        null}

        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
          { label: 'Серия', value: habit.streak },
          { label: 'Лучшая', value: habit.bestStreak },
          { label: 'Неделя', value: `${weekly}/7` },
          { label: 'Месяц', value: `${monthly}/28` }].
          map((s) =>
          <div key={s.label} className="flex flex-col rounded-xl bg-canvas px-2.5 py-2.5">
              <span className="text-[16px] font-semibold tabular-nums leading-none text-ink">
                {s.value}
              </span>
              <span className="mt-auto pt-1.5 text-[11px] text-muted">{s.label}</span>
            </div>
          )}
        </div>
      </div>

      <section className="mt-4 rounded-card border border-line bg-surface px-4 py-4 shadow-card">
        <h2 className="text-[14.5px] font-medium text-ink">Последние 4 недели</h2>
        <div className="mt-3.5 grid grid-cols-7 gap-1.5">
          {habit.history.map((v, i) =>
          <span
            key={i}
            title={v ? 'Выполнено' : 'Пропуск'}
            className="h-7 rounded-md"
            style={{ backgroundColor: v ? '#1F5A44' : '#EDF0EB' }}
            aria-hidden="true" />

          )}
        </div>
        <p className="mt-3 text-[12.5px] text-muted">
          Пропуски — не провал. Важно возвращаться.
        </p>
      </section>

      <section className="mt-4 divide-y divide-line rounded-card border border-line bg-surface shadow-card">
        {habits.map((h) => {
          const rate = Math.round(
            h.history.filter(Boolean).length / Math.max(1, h.history.length) * 100
          );
          return (
            <div key={h.id} className="flex items-center gap-3 px-4 py-3">
              <span className="w-[110px] shrink-0 truncate text-[13.5px] text-ink-soft">
                {h.title}
              </span>
              <span className="h-[7px] flex-1 overflow-hidden rounded-full bg-canvas">
                <span
                  className="block h-full rounded-full bg-primary/80"
                  style={{ width: `${rate}%` }} />
                
              </span>
              <span className="w-9 shrink-0 text-right text-[12px] tabular-nums text-muted">
                {rate}%
              </span>
            </div>);

        })}
      </section>
    </Shell>);

}