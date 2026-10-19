import React, { useState } from 'react';
import { CheckIcon, PlusIcon } from 'lucide-react';
import { HabitFormSheet } from './habits/HabitFormSheet';
import { useApp } from '../contexts/AppContext';
import { recommendedHabits } from '../data/recommendedHabits';
import type { SphereId } from '../types';

interface RecommendedHabitsProps {
  sphereId: SphereId;
}

export function RecommendedHabits({ sphereId }: RecommendedHabitsProps) {
  const { habits, addHabit } = useApp();
  const [creating, setCreating] = useState(false);

  const suggestions = recommendedHabits[sphereId] ?? [];
  const isAdded = (name: string) =>
  habits.some((h) => h.title.toLowerCase() === name.toLowerCase());

  return (
    <section aria-labelledby="recommended-habits" className="mt-8">
      <h2
        id="recommended-habits"
        className="mb-2 px-1 text-[12px] font-medium uppercase tracking-[0.07em] text-muted">
        
        Рекомендуемые привычки
      </h2>

      {suggestions.length > 0 ?
      <div className="divide-y divide-line rounded-card border border-line bg-surface shadow-card">
          {suggestions.map((s) => {
          const added = isAdded(s.title);
          return (
            <div key={s.title} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] text-ink">{s.title}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{s.why}</p>
                </div>
                {added ?
              <span className="mt-0.5 flex shrink-0 items-center gap-1 text-[13px] text-primary">
                    <CheckIcon className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
                    Добавлено
                  </span> :

              <button
                type="button"
                onClick={() =>
                addHabit({ title: s.title, intention: s.why, windowId: s.windowId })
                }
                className="shrink-0 rounded-full border border-primary/30 px-3 py-1.5 text-[13px] font-medium text-primary transition-colors duration-150 ease-out hover:bg-primary-tint">
                
                    Добавить
                  </button>
              }
              </div>);

        })}
        </div> :
      null}

      <button
        type="button"
        onClick={() => setCreating(true)}
        className="mt-2.5 flex items-center gap-1.5 px-1 text-[13.5px] font-medium text-primary">
        
        <PlusIcon className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
        своя привычка
      </button>

      <HabitFormSheet open={creating} onClose={() => setCreating(false)} />
    </section>);

}