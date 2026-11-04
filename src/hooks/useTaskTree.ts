import { useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { indent, moveUnder, outdent, refusalText } from '../utils/taskTree';
import type { TreeResult } from '../utils/taskTree';
import { showToast } from '../utils/toast';
import type { Task } from '../types';

/** Применяет перестройку дерева: меняется только само перенесённое дело */
function applyTo(
updateTask: (id: string, patch: Partial<Omit<Task, 'id'>>) => void,
next: Task[],
id: string)
{
  const t = next.find((x) => x.id === id);
  if (t) updateTask(id, { parentId: t.parentId, sphere: t.sphere, sectionId: t.sectionId, order: t.order });
}

/** Сделать подзадачей / вынести, с тостом, если нельзя */
export function useTaskTree() {
  const { tasks, updateTask } = useApp();

  const apply = useCallback(
    (result: TreeResult, id: string): boolean => {
      if (!result.ok) {
        showToast(refusalText[result.reason]);
        return false;
      }
      applyTo(updateTask, result.tasks, id);
      return true;
    },
    [updateTask]
  );

  return {
    /** свайп вправо: под дело выше в списке */
    indentTask: useCallback(
      (id: string, aboveId: string | undefined) => apply(indent(tasks, id, aboveId), id),
      [tasks, apply]
    ),
    moveTaskUnder: useCallback(
      (id: string, parentId: string) => apply(moveUnder(tasks, id, parentId), id),
      [tasks, apply]
    ),
    outdentTask: useCallback(
      (id: string) => applyTo(updateTask, outdent(tasks, id), id),
      [tasks, updateTask]
    )
  };
}
