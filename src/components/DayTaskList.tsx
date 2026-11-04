import { useState } from 'react';
import { ReorderableList } from './task/ReorderableList';
import { TaskActionSheet } from './task/TaskActionSheet';
import { TaskItem } from './task/TaskItem';
import { useApp } from '../contexts/AppContext';
import type { Task } from '../types';

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
        <TaskItem
          task={task}
          look={{ surface, showDate, sphereColor, checklist: true }}
          controls={controls}
          completing={completing.includes(task.id)}
          onToggle={handleToggle}
          onMenu={setMenuTask} />

        } />
      
      <TaskActionSheet task={menuTask} siblings={tasks} onClose={() => setMenuTask(null)} />
    </>);

}