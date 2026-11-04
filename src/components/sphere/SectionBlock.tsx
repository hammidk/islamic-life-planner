import { ChevronDownIcon } from 'lucide-react';
import { QuickAddRow } from './QuickAddRow';
import { TaskList } from '../task/TaskList';
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
  /** верхние дела и их подзадачи одним списком — дерево строит TaskList */
  const list = tasks.flatMap((t) => [t, ...subtasksOf(t.id)]);

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
        <TaskList
          tasks={list}
          divider="divide-line"
          look={{ surface: 'bg-surface', durationInMeta: true, showPrefix: true, todayToggle: true, onMove }} /> :

        null}
          <div className={tasks.length > 0 ? 'border-t border-line' : ''}>
            <QuickAddRow placeholder={title ? `Дело в «${title}»` : 'Добавить дело'} onAdd={onAdd} />
          </div>
        </div> :
      null}
    </section>);

}
