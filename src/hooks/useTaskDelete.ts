import { useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { collectSubtree } from '../utils/taskTree';
import { showToast } from '../utils/toast';
import { askConfirm } from '../utils/confirm';
import type { Task } from '../types';

/** «2 подзадачи», «5 подзадач» */
export function subtasksWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} подзадачу`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} подзадачи`;
  return `${n} подзадач`;
}

/**
 * Удаление дела: у родителя — с подтверждением «Удалить дело и N подзадач?»,
 * затем тост «Отменить» на 5 секунд. true — удалено.
 */
export function useTaskDelete(): (task: Task) => Promise<boolean> {
  const { tasks, deleteTask, restoreTasks } = useApp();
  return useCallback(
    async (task: Task) => {
      const removed = collectSubtree(tasks, task.id);
      const subs = removed.filter((t) => t.id !== task.id && t.status !== 'cancelled').length;
      if (subs > 0 && !(await askConfirm(`Удалить дело и ${subtasksWord(subs)}?`))) return false;
      deleteTask(task.id);
      showToast(subs > 0 ? `Удалено дело и ${subtasksWord(subs)}` : 'Дело удалено', {
        label: 'Отменить',
        run: () => restoreTasks(removed)
      });
      return true;
    },
    [tasks, deleteTask, restoreTasks]
  );
}
