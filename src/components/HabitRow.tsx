import React from 'react';
import { CheckIcon, ZapIcon } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import type { Habit } from '../types';

interface HabitRowProps {
  habit: Habit;
  onOpen?: (habit: Habit) => void;
}

export function HabitRow({ habit, onOpen }: HabitRowProps) {
  const { toggleHabit } = useApp();
  const meta = [habit.time, habit.duration ? `${habit.duration} мин` : null].
  filter(Boolean).
  join(' · ');

  return (
    <div className="flex items-center gap-3 py-3">
      <button
        type="button"
        onClick={() => toggleHabit(habit.id)}
        aria-pressed={habit.doneToday}
        aria-label={
        habit.doneToday ? `Отменить: ${habit.title}` : `Отметить выполненной: ${habit.title}`
        }
        className={`flex h-[23px] w-[23px] shrink-0 items-center justify-center rounded-full border transition-colors duration-150 ease-out ${
        habit.doneToday ?
        'border-primary bg-primary' :
        'border-[#CBD2C9] hover:border-primary'}`
        }>
        
        {habit.doneToday ? <CheckIcon className="h-3.5 w-3.5 text-white" strokeWidth={2.6} /> : null}
      </button>

      <button
        type="button"
        onClick={() => onOpen?.(habit)}
        disabled={!onOpen}
        className="min-w-0 flex-1 text-left">
        
        <p
          className={`truncate text-[15px] leading-snug ${
          habit.doneToday ? 'text-muted' : 'text-ink'}`
          }>
          
          {habit.title}
        </p>
        {meta ? <p className="mt-0.5 truncate text-[12.5px] text-muted">{meta}</p> : null}
      </button>

      <span
        className="flex shrink-0 items-center gap-0.5 text-[12.5px] font-medium text-ink-soft"
        aria-label={`Серия: ${habit.streak} подряд`}>
        
        <ZapIcon className="h-[13px] w-[13px] text-primary" strokeWidth={2} aria-hidden="true" />
        {habit.streak}
      </span>
    </div>);

}