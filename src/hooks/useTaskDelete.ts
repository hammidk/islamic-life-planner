import { useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { collectSubtree } from '../utils/taskTree';
import { showToast } from '../utils/toast';
import type { Task } from '../types';

/** Удаление дела (с подзадачами) и тост «Отменить» на 5 секунд */
export function useTaskDelete(): (task: Task) => void {
  const { tasks, deleteTask, restoreTasks } = useApp();
  return useCallback(
    (task: Task) => {
      const removed = collectSubtree(tasks, task.id);
      deleteTask(task.id);
      const subs = removed.length - 1;
      showToast(subs > 0 ? `Удалено дело и подзадач: ${subs}` : 'Дело удалено', {
        label: 'Отменить',
        run: () => restoreTasks(removed)
      });
    },
    [tasks, deleteTask, restoreTasks]
  );
}
