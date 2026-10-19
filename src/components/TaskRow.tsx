import React from 'react';
import { CheckIcon } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { formatRowMeta } from '../utils/taskOptions';
import type { Task } from '../types';

interface TaskRowProps {
  task: Task;
  onOpen?: (task: Task) => void;
  right?: React.ReactNode;
  /** временное визуальное состояние отметки (до автоскрытия) */
  checked?: boolean;
  /** своя обработка отметки вместо мгновенного переключения */
  onToggle?: () => void;
  /** показывать день недели и дату в мета-строке */
  showDate?: boolean;
}

export function TaskRow({ task, onOpen, right, checked, onToggle, showDate = true }: TaskRowProps) {
  const { toggleTask } = useApp();
  const done = checked ?? task.status === 'done';
  const inactive = task.status === 'cancelled';
  const note = task.description?.split('\n').find((line) => line.trim())?.trim();
  const meta = formatRowMeta(task, { showDate });

  return (
    <div className="flex items-center gap-3 py-3">
      <button
        type="button"
        onClick={() => onToggle ? onToggle() : toggleTask(task.id)}
        aria-pressed={done}
        aria-label={done ? `Отменить выполнение: ${task.title}` : `Выполнить: ${task.title}`}
        className={`flex h-[23px] w-[23px] shrink-0 items-center justify-center self-start rounded-full border transition-colors duration-150 ease-out ${
        done ? 'border-primary bg-primary' : 'border-[#CBD2C9] bg-transparent hover:border-primary'}`
        }>
        
        {done ? <CheckIcon className="h-3.5 w-3.5 text-white" strokeWidth={2.6} /> : null}
      </button>

      <button
        type="button"
        onClick={() => onOpen?.(task)}
        disabled={!onOpen}
        className="min-w-0 flex-1 text-left">
        
        <p
          className={`truncate text-[15px] leading-snug ${
          done || inactive ? 'text-muted line-through' : 'text-ink'}`
          }>
          
          {task.title}
        </p>
        {note ? <p className="mt-0.5 truncate text-[12.5px] text-muted">{note}</p> : null}
        <p className="mt-0.5 truncate text-[12.5px] text-muted">{meta}</p>
      </button>

      {task.duration ?
      <span className="shrink-0 text-[11.5px] tabular-nums text-muted">{task.duration} мин</span> :
      null}
      {right}
    </div>);

}