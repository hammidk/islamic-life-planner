import { useState } from 'react';
import { ReorderableList } from './ReorderableList';
import { TaskActionSheet } from './TaskActionSheet';
import { TaskItem } from './TaskItem';
import type { TaskItemLook } from './TaskItem';
import { useApp } from '../../contexts/AppContext';
import { useTaskTree } from '../../hooks/useTaskTree';
import { buildTaskTree } from '../../utils/taskTree';
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
}

/**
 * Список дел на любом экране: подзадачи под родителем (отступ 28 px, линия слева),
 * свайпы, долгое нажатие, перетаскивание.
 */
export function TaskList({ tasks, look, divider = 'divide-line', hideDone = false }: TaskListProps) {
  const { tasks: all, toggleTask, reorderTasks } = useApp();
  const { indentTask, outdentTask } = useTaskTree();
  const [completing, setCompleting] = useState<string[]>([]);
  const [menuTask, setMenuTask] = useState<Task | null>(null);
  const nodes = buildTaskTree(tasks, all);

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

  const item = (task: Task, extra: {onIndent?: () => void;onOutdent?: () => void;controls?: Parameters<typeof TaskItem>[0]['controls'];parentTitle?: string;}) =>
  <TaskItem
    task={task}
    look={look}
    controls={extra.controls}
    parentTitle={extra.parentTitle}
    completing={completing.includes(task.id)}
    onToggle={handleToggle}
    onMenu={setMenuTask}
    onIndent={extra.onIndent}
    onOutdent={extra.onOutdent} />;


  const renderNode = (node: TaskNode, controls: Parameters<typeof TaskItem>[0]['controls']) => {
    const index = nodes.indexOf(node);
    const isSub = Boolean(node.parentTitle);
    return (
      <div>
        {item(node.task, {
          controls,
          parentTitle: node.parentTitle,
          // свайп вправо: под дело непосредственно выше; у подзадачи — тост «Глубже нельзя»
          onIndent: () => indentTask(node.task.id, nodes[index - 1]?.task.id),
          onOutdent: isSub ? () => outdentTask(node.task.id) : undefined
        })}
        {node.children.length > 0 ?
        <div className="mb-1 ml-[11px] border-l border-line pl-[17px]">
            <ReorderableList
            items={node.children}
            getId={(t) => t.id}
            onReorder={reorderTasks}
            className={`divide-y ${divider}`}
            itemClassName={look.surface}
            renderItem={(sub, subControls) =>
            item(sub, {
              controls: subControls,
              onIndent: () => indentTask(sub.id, undefined),
              onOutdent: () => outdentTask(sub.id)
            })
            } />
          
          </div> :
        null}
      </div>);

  };

  return (
    <>
      <ReorderableList
        items={nodes}
        getId={(n) => n.task.id}
        className={`divide-y ${divider}`}
        itemClassName={look.surface}
        onReorder={reorderTasks}
        renderItem={renderNode} />
      
      <TaskActionSheet task={menuTask} onClose={() => setMenuTask(null)} />
    </>);

}
