import React from 'react';
import { CheckIcon } from 'lucide-react';
import { SphereIcon } from './SphereIcon';
import { useApp } from '../contexts/AppContext';
import { useLive } from '../contexts/LiveDataContext';
import { isDoneOn, isRepeating } from '../utils/occurrence';
import { prayerName } from '../data/appData';
import { useSpheres } from '../hooks/useSpheres';
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
  /** «Вт 10:00» перед названием — только в списках сфер и разделов */
  showPrefix?: boolean;
  /** день списка: у повторяющегося дела отметка относится к этому вхождению (по умолчанию сегодня) */
  day?: string;
  /** без подписи намаза — строка и так в блоке своего намаза */
  hidePrayer?: boolean;
  /**
   * prayer — внутри зелёного (красного) блока намаза: белый текст в цвет блока, отметка-квадрат
   * как у прежних пунктов, только название, справа время и ↻; логика та же
   */
  variant?: 'default' | 'prayer';
}

export function TaskRow({
  task,
  onOpen,
  right,
  checked,
  onToggle,
  showDate = true,
  sphereColor = false,
  durationInMeta = false,
  showPrefix = false,
  day,
  hidePrayer = false,
  variant = 'default'
}: TaskRowProps) {
  const prayer = variant === 'prayer';
  const { toggleTask } = useApp();
  const { todayISO } = useLive();
  const done = checked ?? isDoneOn(task, day ?? todayISO);
  const inactive = task.status === 'cancelled';
  const note = task.description?.split('\n').find((line) => line.trim())?.trim();
  const prefix = showPrefix && !prayer ? formatTimePrefix(task, todayISO) : null;
  const { getSphere } = useSpheres();
  const ownSphere = getSphere(task.sphere);
  const meta = formatRowMeta(task, { showDate, withSphere: !sphereColor,
    withDuration: durationInMeta,
    sphereName: ownSphere.name,
    prayerName: task.prayerId && !hidePrayer ? prayerName(task.prayerId) : undefined
  });
  const sphere = sphereColor ? ownSphere : null;

  const toggleButton =
  <button
    type="button"
    onClick={() => onToggle ? onToggle() : toggleTask(task.id, day ?? todayISO)}
    aria-pressed={done}
    aria-label={done ? `Отменить выполнение: ${task.title}` : `Выполнить: ${task.title}`}
    className={
    prayer ?
    // как прежние пункты блока: квадрат 17px в области нажатия 44px
    '-ml-2.5 flex h-11 w-11 shrink-0 items-center justify-center' :
    `flex h-[23px] w-[23px] shrink-0 items-center justify-center self-start rounded-full border transition-colors duration-150 ease-out ${
    done ? 'border-primary bg-primary' : 'border-[#CBD2C9] bg-transparent hover:border-primary'}`
    }>
    
      {prayer ?
    <span
      className={`flex h-[17px] w-[17px] items-center justify-center rounded-[5px] border transition-colors duration-150 ease-out ${
      done ? 'border-white bg-white' : 'border-white/60'}`
      }
      aria-hidden="true">
      
          {done ? <CheckIcon className="h-3 w-3 text-primary" strokeWidth={2.8} /> : null}
        </span> :
    done ?
    <CheckIcon className="h-3.5 w-3.5 text-white" strokeWidth={2.6} /> :
    null}
    </button>;


  if (prayer) {
    return (
      <div className="flex min-h-[44px] min-w-0 items-center gap-1">
        {toggleButton}
        <button
          type="button"
          onClick={() => onOpen?.(task)}
          disabled={!onOpen}
          className="min-w-0 flex-1 py-2 text-left">
          
          <span className={`block truncate text-[14px] leading-snug ${done || inactive ? 'text-white/60 line-through' : 'text-white/95'}`}>
            {task.title}
          </span>
          {note ? <span className="mt-0.5 block truncate text-[12px] text-white/70">{note}</span> : null}
        </button>
        {task.time ? <span className="shrink-0 text-[12px] tabular-nums text-white/70">{task.time}</span> : null}
        {isRepeating(task) ?
        <span className="shrink-0 text-[11px] leading-none text-white/70" role="img" aria-label="Повторяется">
            ↻
          </span> :
        null}
        {right}
      </div>);

  }

  return (
    <div className="flex min-w-0 items-center gap-3 py-3">
      {toggleButton}

      <button
        type="button"
        onClick={() => onOpen?.(task)}
        disabled={!onOpen}
        className="min-w-0 flex-1 text-left">
        
        <p
          className={`truncate text-[15px] leading-snug ${
          done || inactive ? 'text-muted line-through' : 'text-ink'}`
          }>
          
          {/* [день и время] [иконка сферы] [название] в одном текстовом элементе — обрезаются троеточием вместе */}
          {prefix ? `${prefix} ` : ''}
          <SphereIcon
            id={ownSphere.id}
            color={ownSphere.color}
            className="mr-1 inline-block h-[14px] w-[14px] align-[-2px]" />
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

      {task.urgent ?
      <span className="shrink-0 text-[16px] font-bold leading-none text-[#D93B30]" role="img" aria-label="Срочное">
          !
        </span> :
      null}
      {task.duration && !durationInMeta ?
      <span className="shrink-0 text-[11.5px] tabular-nums text-muted">{task.duration} мин</span> :
      null}
      {right}
    </div>);

}