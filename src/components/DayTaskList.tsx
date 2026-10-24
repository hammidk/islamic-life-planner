import React, { useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import type { DragControls } from 'framer-motion';
import { TaskRow } from './TaskRow';
import { Checklist } from './Checklist';
import { GestureTaskRow } from './task/GestureTaskRow';
import { ReorderableList } from './task/ReorderableList';
import { DragHandle } from './task/DragHandle';
import { TaskActionSheet } from './task/TaskActionSheet';
import { InlineEdit } from './task/InlineEdit';
import { useApp } from '../contexts/AppContext';
import { useQuickAdd } from '../contexts/QuickAddContext';
import { taskChecklistSuggestions } from '../data/taskValues';
import type { Task } from '../types';

interface TaskItemProps {
  task: Task;
  surface: string;
  controls?: DragControls;
  completing: boolean;
  showDate: boolean;
  sphereColor: boolean;
  onToggle: (task: Task) => void;
  onMenu: (task: Task) => void;
}

function TaskWithChecklist({
  task,
  surface,
  controls,
  completing,
  showDate,
  sphereColor,
  onToggle,
  onMenu
}: TaskItemProps) {
  const { checklists, deleteTask } = useApp();
  const { editingId, startEdit } = useQuickAdd();
  const [open, setOpen] = useState(false);

  const items = checklists[task.id] ?? [];
  const doneItems = items.filter((i) => i.done).length;

  if (editingId === task.id) return <InlineEdit task={task} />;

  return (
    <div>
      <GestureTaskRow
        surface={surface}
        label={task.title}
        onLongPress={() => onMenu(task)}
        onDelete={() => deleteTask(task.id)}>
        
        <TaskRow
          task={task}
          showDate={showDate}
          sphereColor={sphereColor}
          checked={completing || undefined}
          onToggle={() => onToggle(task)}
          onOpen={(t) => startEdit(t.id)}
          right={
          <span className="flex shrink-0 items-center">
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
                className={`h-4 w-4 transition-transform duration-200 ease-out ${
                open ? 'rotate-180' : ''}`
                }
                strokeWidth={1.8}
                aria-hidden="true" />
              
              </button>
              {controls ? <DragHandle controls={controls} label={task.title} /> : null}
            </span>
          } />
        
      </GestureTaskRow>
      {open ?
      <div className="pb-3 pl-[35px]">
          <Checklist targetId={task.id} suggestions={taskChecklistSuggestions} />
        </div> :
      null}
    </div>);

}

interface DayTaskListProps {
  tasks: Task[];
  divider: string;
  /** непрозрачный фон строки (под ним — слой удаления) */
  surface?: string;
  /** выполненные дела исчезают из списка после короткой паузы */
  hideDone?: boolean;
  /** показывать дату в мета-строке */
  showDate?: boolean;
  /** название сферы цветом сферы */
  sphereColor?: boolean;
}

/** Список задач дня: перетаскивание, свайп-удаление, долгое нажатие, раскрываемые пункты */
export function DayTaskList({
  tasks,
  divider,
  surface = 'bg-surface',
  hideDone = false,
  showDate = true,
  sphereColor = false
}: DayTaskListProps) {
  const { toggleTask, reorderTasks } = useApp();
  const [completing, setCompleting] = useState<string[]>([]);
  const [menuTask, setMenuTask] = useState<Task | null>(null);

  const handleToggle = (task: Task) => {
    if (!hideDone || task.status === 'done') {
      toggleTask(task.id);
      return;
    }
    if (completing.includes(task.id)) return;
    // короткая пауза, чтобы отметка была видна перед исчезновением
    setCompleting((prev) => [...prev, task.id]);
    window.setTimeout(() => {
      toggleTask(task.id);
      setCompleting((prev) => prev.filter((id) => id !== task.id));
    }, 450);
  };

  return (
    <>
      <ReorderableList
        items={tasks}
        getId={(t) => t.id}
        className={`divide-y ${divider}`}
        itemClassName={surface}
        onReorder={reorderTasks}
        renderItem={(task, controls) =>
        <TaskWithChecklist
          task={task}
          surface={surface}
          controls={controls}
          showDate={showDate}
          sphereColor={sphereColor}
          completing={completing.includes(task.id)}
          onToggle={handleToggle}
          onMenu={setMenuTask} />

        } />
      
      <TaskActionSheet task={menuTask} siblings={tasks} onClose={() => setMenuTask(null)} />
    </>);

}