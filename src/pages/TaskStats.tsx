import React, { useState } from 'react';
import { Shell, SubHeader } from '../components/Shell';
import { SegmentedControl } from '../components/SegmentedControl';
import { useApp } from '../contexts/AppContext';
import { useLive } from '../contexts/LiveDataContext';
import { spheres } from '../data/appData';
import { computeTaskStats, formatHours } from '../utils/stats';
import type { StatsRange } from '../utils/stats';

export function TaskStats() {
  const { tasks } = useApp();
  const { todayISO } = useLive();
  const [range, setRange] = useState<StatsRange>('week');
  const s = computeTaskStats(tasks, range, todayISO);
  const sphereTotal = s.bySphere.reduce((acc, d) => acc + d.minutes, 0);
  const sphereMax = s.bySphere[0]?.minutes ?? 0;
  const maxBucket = Math.max(0, ...s.buckets.map((b) => b.value));
  const planBase = Math.max(s.planned, s.actual);

  return (
    <Shell>
      <SubHeader title="Статистика дел" subtitle="Как расходуется время" />

      <SegmentedControl
        options={[
        { id: 'week', label: 'Неделя' },
        { id: 'month', label: 'Месяц' }]
        }
        value={range}
        onChange={setRange}
        label="Период статистики" />
      

      {!s.hasData ?
      <p className="mt-6 px-1 text-[14px] leading-relaxed text-muted">
          Пока нет данных за этот период.
        </p> :

      <>
          <div className="mt-5 grid grid-cols-3 gap-2.5">
            {[
          { label: 'Выполнено', value: s.done },
          { label: 'Перенесено', value: s.postponed },
          { label: 'Отменено', value: s.cancelled }].
          map((item) =>
          <div
            key={item.label}
            className="flex flex-col rounded-card border border-line bg-surface px-3 py-3.5 shadow-card">
            
                <span className="text-[22px] font-semibold tabular-nums leading-none text-ink">
                  {item.value}
                </span>
                <span className="mt-auto pt-2 text-[12px] text-muted">{item.label}</span>
              </div>
          )}
          </div>

          <section className="mt-4 rounded-card border border-line bg-surface px-4 py-4 shadow-card">
            <h2 className="text-[14.5px] font-medium text-ink">План и факт</h2>
            <div className="mt-3 space-y-2.5">
              {[
            { label: 'Запланировано', minutes: s.planned, color: '#CBD2C9' },
            { label: 'Фактически', minutes: s.actual, color: '#1F5A44' }].
            map((row) =>
            <div key={row.label}>
                  <div className="flex justify-between text-[12.5px]">
                    <span className="text-muted">{row.label}</span>
                    <span className="tabular-nums text-ink-soft">{formatHours(row.minutes)}</span>
                  </div>
                  <span className="mt-1 block h-[6px] w-full overflow-hidden rounded-full bg-canvas">
                    <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${planBase > 0 ? row.minutes / planBase * 100 : 0}%`,
                    backgroundColor: row.color
                  }} />
                
                  </span>
                </div>
            )}
            </div>
            {s.planned > 0 && s.actual < s.planned ?
          <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
                На {formatHours(s.planned - s.actual)} меньше, чем планировалось.
              </p> :
          null}
            <p className="mt-2 text-[11.5px] text-muted/80">
              Дела без указанной длительности считаются по 5 минут.
            </p>
          </section>

          <section className="mt-4 rounded-card border border-line bg-surface px-4 py-4 shadow-card">
            <h2 className="text-[14.5px] font-medium text-ink">Время по сферам</h2>
            {s.bySphere.length === 0 ?
          <p className="mt-2 text-[13px] text-muted">Выполненных дел пока нет.</p> :

          <div className="mt-3.5 space-y-3">
                {s.bySphere.map((d) => {
              const sphere = spheres.find((s2) => s2.id === d.id);
              if (!sphere) return null;
              return (
                <div key={d.id} className="flex items-center gap-3">
                      <span className="w-[104px] shrink-0 truncate text-[13px] text-ink-soft">
                        {sphere.name}
                      </span>
                      <span className="h-[8px] flex-1 overflow-hidden rounded-full bg-canvas">
                        <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${sphereMax > 0 ? d.minutes / sphereMax * 100 : 0}%`,
                        backgroundColor: sphere.color
                      }} />
                    
                      </span>
                      <span className="w-12 shrink-0 text-right text-[12px] tabular-nums text-muted">
                        {sphereTotal > 0 ? Math.round(d.minutes / sphereTotal * 100) : 0}%
                      </span>
                    </div>);

            })}
              </div>
          }
          </section>

          <section className="mt-4 rounded-card border border-line bg-surface px-4 py-4 shadow-card">
            <h2 className="text-[14.5px] font-medium text-ink">
              {range === 'week' ? 'Выполнено по дням' : 'Выполнено по неделям'}
            </h2>
            <div className="mt-4 flex h-28 items-end gap-2">
              {s.buckets.map((b) =>
            <div key={b.label} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-[11px] tabular-nums text-muted">{b.value > 0 ? b.value : ''}</span>
                  <span
                className="w-full rounded-t-md bg-primary/85"
                style={{ height: `${maxBucket > 0 ? b.value / maxBucket * 72 : 0}px` }}
                aria-hidden="true" />
              
                  <span className="text-[11px] text-muted">{b.label}</span>
                </div>
            )}
            </div>
          </section>
        </>
      }
    </Shell>);

}