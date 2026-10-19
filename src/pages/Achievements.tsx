import React from 'react';
import { Shell, SubHeader } from '../components/Shell';
import { useApp } from '../contexts/AppContext';
import { achievements, spheres } from '../data/appData';

export function Achievements() {
  const { goals } = useApp();

  return (
    <Shell>
      <SubHeader title="Цели и достижения" subtitle="Путь, а не рейтинг" />

      <section aria-labelledby="goals-progress">
        <h2
          id="goals-progress"
          className="mb-2 px-1 text-[12px] font-medium uppercase tracking-[0.08em] text-muted">
          
          Движение по целям
        </h2>
        {goals.length === 0 ?
        <p className="px-1 text-[14px] leading-relaxed text-muted">
            Пока нет целей. Большие намерения складываются из маленьких дел.
          </p> :

        <div className="divide-y divide-line rounded-card border border-line bg-surface shadow-card">
          {goals.map((goal) => {
            const sphere = spheres.find((s) => s.id === goal.sphere);
            return (
              <div key={goal.id} className="px-4 py-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 truncate text-[15px] text-ink">{goal.title}</p>
                  <span className="shrink-0 text-[12.5px] tabular-nums text-muted">
                    {goal.progress}%
                  </span>
                </div>
                <p className="mt-0.5 text-[12.5px] text-muted">
                  {sphere?.name} · {goal.horizon}
                </p>
                <span className="mt-2 block h-[4px] w-full overflow-hidden rounded-full bg-canvas">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${goal.progress}%`, backgroundColor: sphere?.color }} />
                  
                </span>
              </div>);

          })}
        </div>
        }
      </section>

      <section aria-labelledby="milestones" className="mt-7">
        <h2
          id="milestones"
          className="mb-2 px-1 text-[12px] font-medium uppercase tracking-[0.08em] text-muted">
          
          Пройденные вехи
        </h2>
        {achievements.length === 0 ?
        <p className="px-1 text-[14px] leading-relaxed text-muted">
            Здесь появятся значимые вехи вашего пути.
          </p> :

        <div className="divide-y divide-line rounded-card border border-line bg-surface shadow-card">
          {achievements.map((a) =>
          <div key={a.id} className="flex items-start gap-3 px-4 py-3.5">
              <span
              className="mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full bg-primary"
              aria-hidden="true" />
            
              <div className="min-w-0 flex-1">
                <p className="text-[15px] text-ink">{a.title}</p>
                <p className="mt-0.5 text-[12.5px] text-muted">{a.note}</p>
              </div>
              <span className="shrink-0 text-[12px] text-muted">{a.date}</span>
            </div>
          )}
        </div>
        }
      </section>
    </Shell>);

}