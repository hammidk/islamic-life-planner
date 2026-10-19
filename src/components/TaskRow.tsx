import React from 'react';
import { CheckIcon } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { spheres } from '../data/appData';
import { formatRowMeta, formatTimePrefix } from '../utils/taskOptions';
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
  /** название сферы цветом сферы */
  sphereColor?: boolean;
  /** длительность в мета-строке, а не справа (тесные строки) */
  durationInMeta?: boolean;
}

export function TaskRow({
  task,
  onOpen,
  right,
  checked,
  onToggle,
  showDate = true,
  sphereColor = false,
  durationInMeta = false
}: TaskRowProps) {
  const { toggleTask } = useApp();
  const done = checked ?? task.status === 'done';
  const inactive = task.status === 'cancelled';
  const note = task.description?.split('\n').find((line) => line.trim())?.trim();
  const prefix = formatTimePrefix(task);
  const meta = formatRowMeta(task, { showDate, withSphere: !sphereColor, withDuration: durationInMeta });
  const sphere = sphereColor ? spheres.find((s) => s.id === task.sphere) ?? spheres[spheres.length - 1] : null;

  return (
    <div className="flex min-w-0 items-center gap-3 py-3">
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
          
          {/* префикс в том же текстовом элементе и тем же шрифтом — обрезается троеточием вместе с названием */}
          {prefix ? `${prefix} ` : ''}
          {task.title}
        </p>
        {note ? <p className="mt-0.5 truncate text-[12.5px] text-muted">{note}</p> : null}
        <p className="mt-0.5 truncate text-[12.5px] text-muted">
          {meta}
          {sphere ?
          <span style={{ color: sphere.color }}>
              {meta ? ' · ' : ''}
              {sphere.name}
            </span> :
          null}
        </p>
      </button>

      {task.duration && !durationInMeta ?
      <span className="shrink-0 text-[11.5px] tabular-nums text-muted">{task.duration} мин</span> :
      null}
      {right}
    </div>);

}