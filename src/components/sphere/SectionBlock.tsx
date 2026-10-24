import React, { useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { SphereTaskItem } from './SphereTaskItem';
import { QuickAddRow } from './QuickAddRow';
import { ReorderableList } from '../task/ReorderableList';
import { TaskActionSheet } from '../task/TaskActionSheet';
import { useApp } from '../../contexts/AppContext';
import type { Task } from '../../types';

interface SectionBlockProps {
  /** без заголовка — дела вне разделов */
  title?: string;
  collapsed?: boolean;
  onToggle?: () => void;
  tasks: Task[];
  subtasksOf: (id: string) => Task[];
  onMove: ((task: Task) => void) | null;
  onAdd: (title: string) => void;
}

export function SectionBlock({
  title,
  collapsed = false,
  onToggle,
  tasks,
  subtasksOf,
  onMove,
  onAdd
}: SectionBlockProps) {
  const { reorderTasks, updateTask } = useApp();
  const [menuTask, setMenuTask] = useState<Task | null>(null);

  /**
   * Свайп вправо, как в «Напоминаниях»: дело становится подзадачей ближайшего дела выше
   * (сфера и раздел — родителя). Первое дело и дело со своими подзадачами не отступают:
   * максимум два уровня.
   */
  const indent = (task: Task, index: number) => {
    if (index === 0 || subtasksOf(task.id).length > 0) return;
    const parent = tasks[index - 1];
    updateTask(task.id, { parentId: parent.id, sphere: parent.sphere, sectionId: parent.sectionId });
  };

  /** подзадача возвращается на верхний уровень сразу после родителя и его подзадач */
  const outdent = (parent: Task, sub: Task) => {
    updateTask(sub.id, { parentId: undefined, order: (parent.order ?? 0) + 0.5 });
  };

  return (
    <section>
      {title ?
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="mb-2 flex w-full items-center gap-1.5 px-1 text-left">
        
          <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ease-out ${
          collapsed ? '-rotate-90' : ''}`
          }
          strokeWidth={2}
          aria-hidden="true" />
        
          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{title}</span>
          <span className="shrink-0 text-[12.5px] tabular-nums text-muted">{tasks.length}</span>
        </button> :
      null}

      {!collapsed ?
      <div className="rounded-card border border-line bg-surface px-4 shadow-card">
          {tasks.length > 0 ?
        <ReorderableList
          items={tasks}
          getId={(t) => t.id}
          onReorder={reorderTasks}
          className="divide-y divide-line"
          itemClassName="bg-surface"
          renderItem={(task, controls) =>
          <SphereTaskItem
            task={task}
            subtasks={subtasksOf(task.id)}
            onMove={onMove}
            onMenu={setMenuTask}
            controls={controls}
            onIndent={() => indent(task, tasks.indexOf(task))}
            onOutdent={(sub) => outdent(task, sub)} />

          } /> :

        null}
          <div className={tasks.length > 0 ? 'border-t border-line' : ''}>
            <QuickAddRow placeholder={title ? `Дело в «${title}»` : 'Добавить дело'} onAdd={onAdd} />
          </div>
        </div> :
      null}

      <TaskActionSheet task={menuTask} siblings={tasks} onClose={() => setMenuTask(null)} />
    </section>);

}