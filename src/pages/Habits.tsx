import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2Icon, ChevronDownIcon, PlusIcon } from 'lucide-react';
import { Shell } from '../components/Shell';
import { HabitRow } from '../components/HabitRow';
import { ProfileButton } from '../components/ProfileButton';
import { IconButton } from '../components/IconButton';
import { HabitFormSheet, habitWindows } from '../components/habits/HabitFormSheet';
import { useApp } from '../contexts/AppContext';
import { useLive } from '../contexts/LiveDataContext';
import type { Habit } from '../types';

interface HabitGroup {
  id: string;
  title: string;
  hint?: string;
  habits: Habit[];
}

export function Habits() {
  const navigate = useNavigate();
  const { habits } = useApp();
  const { prayers } = useLive();
  const [creating, setCreating] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  /** завершённые не показываются, но остаются в данных */
  const active = habits.filter((h) => !h.finished);
  const timeOf = (id: string) => prayers.find((p) => p.id === id)?.time ?? '––:––';

  const groups: HabitGroup[] = habitWindows.map((w, i) => {
    const nextId = habitWindows[(i + 1) % habitWindows.length].id;
    return {
      id: w.id,
      title: w.label,
      hint: `${timeOf(w.id)}–${timeOf(nextId)}`,
      habits: active.filter((h) => h.windowId === w.id)
    };
  });
  const unbound = active.filter((h) => !h.windowId);
  if (unbound.length > 0) groups.push({ id: 'none', title: 'Без привязки', habits: unbound });

  return (
    <Shell nav>
      <header className="flex items-center justify-between gap-3 pb-5 pt-3">
        <div className="min-w-0">
          <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.015em] text-ink">
            Привычки
          </h1>
          <p className="mt-0.5 text-[13px] text-muted">
            {active.length > 0 ?
            `Сегодня выполнено ${active.filter((h) => h.doneToday).length} из ${active.length}` :
            'Небольшие дела каждый день'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <IconButton label="Статистика привычек" onClick={() => navigate('/habits/stats')}>
            <BarChart2Icon className="h-[17px] w-[17px]" strokeWidth={1.8} aria-hidden="true" />
          </IconButton>
          <ProfileButton />
        </div>
      </header>

      <div className="space-y-1">
        {groups.map((group) => {
          const isCollapsed = Boolean(collapsed[group.id]);
          const done = group.habits.filter((h) => h.doneToday).length;
          return (
            <section key={group.id} aria-labelledby={`habits-${group.id}`}>
              <button
                type="button"
                id={`habits-${group.id}`}
                onClick={() => setCollapsed((prev) => ({ ...prev, [group.id]: !prev[group.id] }))}
                aria-expanded={!isCollapsed}
                className="flex w-full items-center gap-2 px-1 py-2.5 text-left">
                
                <ChevronDownIcon
                  className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ease-out ${
                  isCollapsed ? '-rotate-90' : ''}`
                  }
                  strokeWidth={2}
                  aria-hidden="true" />
                
                <span className="min-w-0 truncate text-[15px] font-semibold text-ink">
                  {group.title}
                </span>
                {group.hint ?
                <span className="shrink-0 text-[12.5px] tabular-nums text-muted">{group.hint}</span> :
                null}
                <span className="ml-auto shrink-0 text-[12.5px] tabular-nums text-muted">
                  {group.habits.length > 0 ? `выполнено ${done} из ${group.habits.length}` : ''}
                </span>
              </button>
              {!isCollapsed ?
              group.habits.length > 0 ?
              <div className="divide-y divide-line border-b border-line pl-7">
                    {group.habits.map((habit) =>
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  onOpen={() => navigate('/habits/stats')} />

                )}
                  </div> :

              <p className="pb-2 pl-7 text-[12.5px] text-muted">Пока нет привычек</p> :

              null}
            </section>);

        })}
      </div>

      <button
        type="button"
        onClick={() => setCreating(true)}
        className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-card border border-dashed border-line py-3.5 text-[13.5px] text-muted transition-colors duration-150 ease-out hover:border-primary/40 hover:text-primary">
        
        <PlusIcon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        Создать привычку
      </button>

      <p className="mt-5 px-1 text-[12.5px] leading-relaxed text-muted">
        Число рядом с привычкой — сколько раз подряд она выполнена.
      </p>

      <HabitFormSheet open={creating} onClose={() => setCreating(false)} />
    </Shell>);

}