import React, { useState } from 'react';
import { CalendarCheckIcon, CalendarPlusIcon, ChevronDownIcon, FolderInputIcon } from 'lucide-react';
import type { DragControls } from 'framer-motion';
import { TaskRow } from '../TaskRow';
import { Checklist } from '../Checklist';
import { SwipeRow } from './SwipeRow';
import { DragHandle } from './DragHandle';
import { InlineEdit } from './InlineEdit';
import { useApp } from '../../contexts/AppContext';
import { useQuickAdd } from '../../contexts/QuickAddContext';
import { useLive } from '../../contexts/LiveDataContext';
import { useTaskDelete } from '../../hooks/useTaskDelete';
import type { Task } from '../../types';

/** Как выглядит строка в конкретном списке */
export interface TaskItemLook {
  /** непрозрачный фон строки (под ним — слои действий) */
  surface: string;
  showDate?: boolean;
  sphereColor?: boolean;
  /** «Вт 10:00» перед названием (сферы и разделы) */
  showPrefix?: boolean;
  durationInMeta?: boolean;
  /** кнопка «На сегодня» (сферы и разделы) */
  todayToggle?: boolean;
  /** раскрываемые пункты (списки дня) */
  checklist?: boolean;
  /** кнопка «Переместить в раздел»; null — разделов нет */
  onMove?: ((task: Task) => void) | null;
}

interface TaskItemProps {
  task: Task;
  look: TaskItemLook;
  controls?: DragControls;
  /** временная отметка до автоскрытия */
  completing?: boolean;
  onToggle?: (task: Task) => void;
  onMenu: (task: Task) => void;
  onIndent?: () => void;
  onOutdent?: () => void;
  /** подзадача без родителя в этом списке: «↳ Название родителя» */
  parentTitle?: string;
}

/** «На сегодня»: дата = сегодня без времени; повторное нажатие снимает дату */
function TodayToggle({ task }: {task: Task;}) {
  const { updateTask } = useApp();
  const { todayISO } = useLive();
  if (task.time) return null;
  const on = task.date === todayISO;
  return (
    <button
      type="button"
      onClick={() => updateTask(task.id, { date: on ? undefined : todayISO })}
      aria-pressed={on}
      aria-label={on ? `Убрать «${task.title}» с сегодня` : `Отметить «${task.title}» на сегодня`}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-150 ease-out ${
      on ? 'bg-primary-tint text-primary' : 'text-muted hover:bg-canvas hover:text-ink'}`
      }>

      {on ?
      <CalendarCheckIcon className="h-[16px] w-[16px]" strokeWidth={1.9} aria-hidden="true" /> :
      <CalendarPlusIcon className="h-[16px] w-[16px]" strokeWidth={1.8} aria-hidden="true" />}
    </button>);

}

/** Одна строка дела на всех экранах: жесты, правка на месте, пункты */
export function TaskItem({ task, look, controls, completing, onToggle, onMenu, onIndent, onOutdent, parentTitle }: TaskItemProps) {
  const { checklists, tasks } = useApp();
  const { editingId, startEdit } = useQuickAdd();
  const remove = useTaskDelete();
  const [open, setOpen] = useState(false);

  if (editingId === task.id) return <InlineEdit task={task} />;

  const items = checklists[task.id] ?? [];
  const hasChildren = tasks.some((t) => t.parentId === task.id && t.status !== 'cancelled');
  const doneItems = items.filter((i) => i.done).length;

  return (
    <div>
      <SwipeRow
        id={task.id}
        label={task.title}
        surface={look.surface}
        onLongPress={() => onMenu(task)}
        onDelete={() => void remove(task)}
        confirmDelete={hasChildren}
        onIndent={onIndent}
        onOutdent={onOutdent}>

        {parentTitle ?
        <p className="-mb-2.5 truncate pl-[35px] pt-2 text-[11.5px] text-muted">↳ {parentTitle}</p> :
        null}
        <TaskRow
          task={task}
          showDate={look.showDate}
          sphereColor={look.sphereColor}
          showPrefix={look.showPrefix}
          durationInMeta={look.durationInMeta}
          checked={completing || undefined}
          onToggle={onToggle ? () => onToggle(task) : undefined}
          onOpen={(t) => startEdit(t.id)}
          right={
          <span className="flex shrink-0 items-center">
              {look.todayToggle ? <TodayToggle task={task} /> : null}
              {look.onMove ?
            <button
              type="button"
              onClick={() => look.onMove?.(task)}
              aria-label={`Переместить «${task.title}» в раздел`}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors duration-150 ease-out hover:bg-canvas hover:text-ink">

                  <FolderInputIcon className="h-[16px] w-[16px]" strokeWidth={1.8} aria-hidden="true" />
                </button> :
            null}
              {look.checklist ?
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? 'Скрыть пункты' : 'Показать пункты'}
              className="flex shrink-0 items-center gap-1 rounded-full px-1.5 py-1 text-[12px] text-muted transition-colors duration-150 ease-out hover:bg-surface">

                  {items.length > 0 ?
              <span className="tabular-nums">
                      {doneItems}/{items.length}
                    </span> :
              null}
                  <ChevronDownIcon
                className={`h-4 w-4 transition-transform duration-200 ease-out ${open ? 'rotate-180' : ''}`}
                strokeWidth={1.8}
                aria-hidden="true" />

                </button> :
            null}
              {controls ? <DragHandle controls={controls} label={task.title} /> : null}
            </span>
          } />

      </SwipeRow>
      {look.checklist && open ?
      <div className="pb-3 pl-[35px]">
          <Checklist targetId={task.id} />
        </div> :
      null}
    </div>);

}
