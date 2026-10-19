import React, { useState } from 'react';
import { Shell, SubHeader } from '../components/Shell';
import { SegmentedControl } from '../components/SegmentedControl';
import { useApp } from '../contexts/AppContext';
import { useLive } from '../contexts/LiveDataContext';
import { spheres } from '../data/appData';
import { computeTaskStats } from '../utils/stats';
import type { StatsRange } from '../utils/stats';

const visible = spheres.filter((s) => s.id !== 'other');

export function LifeBalance() {
  const { tasks } = useApp();
  const { todayISO } = useLive();
  const [range, setRange] = useState<StatsRange>('week');
  const stats = computeTaskStats(tasks, range, todayISO);
  /** часы по сферам из выполненных дел периода */
  const hoursOf = (id: string) => {
    const minutes = stats.bySphere.find((d) => d.id === id)?.minutes ?? 0;
    return Math.round(minutes / 60 * 10) / 10;
  };
  const max = Math.max(0, ...visible.map((s) => hoursOf(s.id)));
  const total = visible.reduce((acc, s) => acc + hoursOf(s.id), 0);

  return (
    <Shell>
      <SubHeader title="Баланс сфер" subtitle="Куда уходит внимание" />

      <SegmentedControl
        options={[
        { id: 'week', label: 'Неделя' },
        { id: 'month', label: 'Месяц' }]
        }
        value={range}
        onChange={setRange}
        label="Период" />
      

      {total <= 0 ?
      <p className="mt-6 px-1 text-[14px] leading-relaxed text-muted">
          Пока нет данных за этот период.
        </p> :

      <section className="mt-5 rounded-card border border-line bg-surface px-4 py-5 shadow-card">
          <div className="space-y-4">
            {visible.map((s) => {
            const value = hoursOf(s.id);
            const share = total > 0 ? Math.round(value / total * 100) : 0;
            return (
              <div key={s.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[14.5px] text-ink">{s.name}</span>
                    <span className="shrink-0 text-[12.5px] tabular-nums text-muted">
                      {value} ч · {share}%
                    </span>
                  </div>
                  <span className="mt-1.5 block h-[10px] w-full overflow-hidden rounded-full bg-canvas">
                    <span
                    className="block h-full rounded-full"
                    style={{ width: `${max > 0 ? value / max * 100 : 0}%`, backgroundColor: s.color }} />
                  
                  </span>
                </div>);

          })}
          </div>
        </section>
      }

      <p className="mt-5 px-1 text-[13px] leading-relaxed text-muted">
        Здесь нет «правильного» баланса. Эта картина нужна только тебе — чтобы заметить, какая
        сфера давно осталась без внимания.
      </p>
    </Shell>);

}