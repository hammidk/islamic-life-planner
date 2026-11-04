import type { DragControls } from 'framer-motion';
import { ReorderableList } from '../task/ReorderableList';
import { TaskItem } from '../task/TaskItem';
import type { TaskItemLook } from '../task/TaskItem';
import { useApp } from '../../contexts/AppContext';
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
  /** «Вынести» у подзадачи: вернуть на верхний уровень */
  onOutdent?: (sub: Task) => void;
}

/** Задача сферы с вложенными подзадачами; обе ступени перетаскиваются в пределах своего уровня */
export function SphereTaskItem({ task, subtasks, onMove, onMenu, controls, onIndent, onOutdent }: SphereTaskItemProps) {
  const { reorderTasks } = useApp();
  const look: TaskItemLook = {
    surface: 'bg-surface',
    durationInMeta: true,
    showPrefix: true,
    todayToggle: true,
    onMove
  };

  return (
    <div>
      <TaskItem task={task} look={look} controls={controls} onMenu={onMenu} onIndent={onIndent} />
      {subtasks.length > 0 ?
      <div className="mb-2 ml-3 border-l border-line pl-4">
          <ReorderableList
          items={subtasks}
          getId={(t) => t.id}
          onReorder={reorderTasks}
          itemClassName="bg-surface"
          renderItem={(sub, subControls) =>
          <TaskItem
            task={sub}
            look={{ ...look, onMove: null }}
            controls={subControls}
            onMenu={onMenu}
            onOutdent={onOutdent ? () => onOutdent(sub) : undefined} />

          } />

        </div> :
      null}
    </div>);

}
