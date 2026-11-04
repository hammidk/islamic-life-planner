import { useState } from 'react';
import { SortableList } from './SortableList';
import type { DragRowState } from './SortableList';
import { TaskActionSheet } from './TaskActionSheet';
import { TaskItem } from './TaskItem';
import type { TaskItemLook } from './TaskItem';
import { TaskRow } from '../TaskRow';
import { useApp } from '../../contexts/AppContext';
import { useLive } from '../../contexts/LiveDataContext';
import { isDoneOn } from '../../utils/occurrence';
import { useTaskTree } from '../../hooks/useTaskTree';
import { buildTaskTree, canMoveUnder } from '../../utils/taskTree';
import type { TaskNode } from '../../utils/taskTree';
import type { Task } from '../../types';

interface TaskListProps {
  /** дела списка вместе с подзадачами — порядок уже задан */
  tasks: Task[];
  look: TaskItemLook;
  /** разделители между строками, например divide-line */
  divider?: string;
  /** выполненные дела исчезают из списка после короткой паузы */
  hideDone?: boolean;
  /** день списка: отметка повторяющегося дела — вхождение этого дня (по умолчанию сегодня) */
  day?: string;
}

/**
 * Список дел на любом экране: подзадачи под родителем (отступ 28 px, линия слева),
 * свайпы, долгое нажатие, перетаскивание (дело переезжает вместе с подзадачами).
 */
export function TaskList({ tasks, look, divider = 'divide-line', hideDone = false, day }: TaskListProps) {
  const { tasks: all, toggleTask, reorderTasks } = useApp();
  const { indentTask, outdentTask, moveTaskUnder } = useTaskTree();
  const [completing, setCompleting] = useState<string[]>([]);
  const [menuTask, setMenuTask] = useState<Task | null>(null);
  const nodes = buildTaskTree(tasks, all);

  const { todayISO } = useLive();
  const listDay = day ?? todayISO;

  const handleToggle = (task: Task) => {
    if (!hideDone || isDoneOn(task, listDay)) {
      toggleTask(task.id, listDay);
      return;
    }
    if (completing.includes(task.id)) return;
    // короткая пауза, чтобы отметка была видна перед исчезновением
    setCompleting((prev) => [...prev, task.id]);
    window.setTimeout(() => {
      toggleTask(task.id, listDay);
      setCompleting((prev) => prev.filter((id) => id !== task.id));
    }, 450);
  };

  const item = (
  task: Task,
  drag: DragRowState,
  extra: {onIndent: () => void;onOutdent?: () => void;parentTitle?: string;sub?: boolean;}) =>

  <TaskItem
    task={task}
    look={extra.sub ? { ...look, onMove: null } : look}
    drag={drag}
    parentTitle={extra.parentTitle}
    day={listDay}
    completing={completing.includes(task.id)}
    onToggle={handleToggle}
    onMenu={setMenuTask}
    onIndent={extra.onIndent}
    onOutdent={extra.onOutdent} />;


  /** копия строки в руке при перетаскивании */
  const prayer = look.variant === 'prayer';
  /** копия строки в руке: в блоке намаза — подсветка white/10 поверх цвета блока, без тени */
  const overlay = (task: Task) =>
  <div className={`rounded-xl px-1 ${look.surface}`}>
      <div className={prayer ? '-mx-1 rounded-xl bg-white/10 px-1' : ''}>
        <TaskRow
        task={task}
        variant={look.variant}
        showDate={look.showDate}
        sphereColor={look.sphereColor}
        showPrefix={look.showPrefix}
        durationInMeta={look.durationInMeta} />
      
      </div>
    </div>;


  const renderNode = (node: TaskNode, index: number, drag: DragRowState) =>
  <div>
      {item(node.task, drag, {
      parentTitle: node.parentTitle,
      // свайп вправо: под дело непосредственно выше; у подзадачи — тост «Глубже нельзя»
      onIndent: () => indentTask(node.task.id, nodes[index - 1]?.task.id),
      onOutdent: node.parentTitle ? () => outdentTask(node.task.id) : undefined
    })}
      {node.children.length > 0 && !drag.isDragging ?
    <div className={`mb-1 ml-[11px] border-l pl-[17px] ${prayer ? 'border-white/25' : 'border-line'}`}>
          <SortableList
        items={node.children}
        getId={(t) => t.id}
        onReorder={reorderTasks}
        onMenu={setMenuTask}
        overlayClassName={prayer ? 'rounded-xl' : undefined}
        className={`divide-y ${divider}`}
        renderOverlay={overlay}
        renderItem={(sub, subDrag) =>
        item(sub, subDrag, {
          sub: true,
          onIndent: () => indentTask(sub.id, undefined),
          onOutdent: () => outdentTask(sub.id)
        })
        } />

        </div> :
    null}
    </div>;


  return (
    <>
      <SortableList
        items={nodes}
        getId={(n) => n.task.id}
        className={`divide-y ${divider}`}
        onReorder={reorderTasks}
        onMenu={(n) => setMenuTask(n.task)}
        canNest={(n, parent) => canMoveUnder(all, n.task.id, parent.task.id) === null}
        onNest={(n, parent) => moveTaskUnder(n.task.id, parent.task.id)}
        overlayClassName={prayer ? 'rounded-xl' : undefined}
        renderOverlay={(n) =>
        <div>
            {overlay(n.task)}
            {n.children.length > 0 ?
          <p className={`pb-2 pl-[40px] text-[12px] ${prayer ? 'text-white/70' : 'text-muted'} ${look.surface}`}>+ подзадач: {n.children.length}</p> :
          null}
          </div>
        }
        renderItem={(n, drag) => renderNode(n, nodes.indexOf(n), drag)} />

      <TaskActionSheet task={menuTask} onClose={() => setMenuTask(null)} />
    </>);

}
