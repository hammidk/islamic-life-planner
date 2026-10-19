import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckIcon, FolderInputIcon } from 'lucide-react';
import type { DragControls } from 'framer-motion';
import { TaskRow } from '../TaskRow';
import { GestureTaskRow } from '../task/GestureTaskRow';
import { ReorderableList } from '../task/ReorderableList';
import { DragHandle } from '../task/DragHandle';
import { useApp } from '../../contexts/AppContext';
import { useLive } from '../../contexts/LiveDataContext';
import type { Task } from '../../types';

interface SphereTaskItemProps {
  task: Task;
  subtasks: Task[];
  /** null — перемещение недоступно (нет разделов) */
  onMove: ((task: Task) => void) | null;
  onMenu: (task: Task) => void;
  controls: DragControls;
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
      className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px] transition-colors duration-150 ease-out ${
      on ? 'border-primary/40 bg-primary-tint text-primary' : 'border-line text-muted hover:text-ink'}`
      }>
      
      {on ? <CheckIcon className="h-3 w-3" strokeWidth={2.6} aria-hidden="true" /> : null}
      <span className="whitespace-nowrap">На сегодня</span>
    </button>);

}

/** Задача сферы с вложенными подзадачами; обе ступени перетаскиваются в пределах своего уровня */
export function SphereTaskItem({ task, subtasks, onMove, onMenu, controls }: SphereTaskItemProps) {
  const navigate = useNavigate();
  const { deleteTask, reorderTasks } = useApp();
  const open = (t: Task) => navigate(`/task/${t.id}`);

  return (
    <div>
      <GestureTaskRow
        surface="bg-surface"
        label={task.title}
        onLongPress={() => onMenu(task)}
        onDelete={() => deleteTask(task.id)}>
        
        <TaskRow
          task={task}
          onOpen={open}
          right={
          <span className="flex shrink-0 items-center gap-1">
              <TodayToggle task={task} />
              {onMove ?
            <button
              type="button"
              onClick={() => onMove(task)}
              aria-label={`Переместить «${task.title}» в раздел`}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors duration-150 ease-out hover:bg-canvas hover:text-ink">
              
                  <FolderInputIcon className="h-[16px] w-[16px]" strokeWidth={1.8} />
                </button> :
            null}
              <DragHandle controls={controls} label={task.title} />
            </span>
          } />
        
      </GestureTaskRow>
      {subtasks.length > 0 ?
      <div className="mb-2 ml-3 border-l border-line pl-4">
          <ReorderableList
          items={subtasks}
          getId={(t) => t.id}
          onReorder={reorderTasks}
          itemClassName="bg-surface"
          renderItem={(sub, subControls) =>
          <GestureTaskRow
            surface="bg-surface"
            label={sub.title}
            onLongPress={() => onMenu(sub)}
            onDelete={() => deleteTask(sub.id)}>
            
                <TaskRow
              task={sub}
              onOpen={open}
              right={
              <span className="flex shrink-0 items-center gap-1">
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