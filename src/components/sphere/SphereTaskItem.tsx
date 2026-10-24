import React from 'react';
import { CalendarCheckIcon, CalendarPlusIcon, FolderInputIcon } from 'lucide-react';
import type { DragControls } from 'framer-motion';
import { TaskRow } from '../TaskRow';
import { GestureTaskRow } from '../task/GestureTaskRow';
import { ReorderableList } from '../task/ReorderableList';
import { DragHandle } from '../task/DragHandle';
import { InlineEdit } from '../task/InlineEdit';
import { useApp } from '../../contexts/AppContext';
import { useQuickAdd } from '../../contexts/QuickAddContext';
import { useLive } from '../../contexts/LiveDataContext';
import type { Task } from '../../types';

interface SphereTaskItemProps {
  task: Task;
  subtasks: Task[];
  /** null — перемещение недоступно (нет разделов) */
  onMove: ((task: Task) => void) | null;
  onMenu: (task: Task) => void;
  controls: DragControls;
  /** свайп вправо по делу: сделать подзадачей вышестоящего */
  onIndent?: () => void;
  /** свайп вправо по подзадаче: вернуть на верхний уровень */
  onOutdent?: (sub: Task) => void;
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

/** Задача сферы с вложенными подзадачами; обе ступени перетаскиваются в пределах своего уровня */
export function SphereTaskItem({
  task,
  subtasks,
  onMove,
  onMenu,
  controls,
  onIndent,
  onOutdent
}: SphereTaskItemProps) {
  const { deleteTask, reorderTasks } = useApp();
  const { editingId, startEdit } = useQuickAdd();
  const open = (t: Task) => startEdit(t.id);

  return (
    <div>
      {editingId === task.id ?
      <InlineEdit task={task} /> :

      <GestureTaskRow
        surface="bg-surface"
        label={task.title}
        onLongPress={() => onMenu(task)}
        onDelete={() => deleteTask(task.id)}
        onIndent={onIndent}>
        
        <TaskRow
          task={task}
          durationInMeta
          showPrefix
          onOpen={open}
          right={
          <span className="flex shrink-0 items-center">
              <TodayToggle task={task} />
              {onMove ?
            <button
              type="button"
              onClick={() => onMove(task)}
              aria-label={`Переместить «${task.title}» в раздел`}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors duration-150 ease-out hover:bg-canvas hover:text-ink">
              
                  <FolderInputIcon className="h-[16px] w-[16px]" strokeWidth={1.8} aria-hidden="true" />
                </button> :
            null}
              <DragHandle controls={controls} label={task.title} />
            </span>
          } />
        
      </GestureTaskRow>
      }
      {subtasks.length > 0 ?
      <div className="mb-2 ml-3 border-l border-line pl-4">
          <ReorderableList
          items={subtasks}
          getId={(t) => t.id}
          onReorder={reorderTasks}
          itemClassName="bg-surface"
          renderItem={(sub, subControls) =>
          editingId === sub.id ?
          <InlineEdit task={sub} /> :

          <GestureTaskRow
            surface="bg-surface"
            label={sub.title}
            onLongPress={() => onMenu(sub)}
            onDelete={() => deleteTask(sub.id)}
            onIndent={onOutdent ? () => onOutdent(sub) : undefined}
            indentLabel="На верхний уровень">
            
                <TaskRow
              task={sub}
              durationInMeta
              showPrefix
              onOpen={open}
              right={
              <span className="flex shrink-0 items-center">
                      <TodayToggle task={sub} />
                      <DragHandle controls={subControls} label={sub.title} />
                    </span>
              } />
            
              </GestureTaskRow>
          } />
        
        </div> :
      null}
    </div>);

}