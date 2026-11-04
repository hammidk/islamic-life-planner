import type { Task } from '../types';

/** Дело и все его подзадачи (на любой глубине, без зацикливания) */
export function collectSubtree(tasks: Task[], id: string): Task[] {
  const ids = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    tasks.forEach((t) => {
      if (t.parentId && ids.has(t.parentId) && !ids.has(t.id)) {
        ids.add(t.id);
        grew = true;
      }
    });
  }
  return tasks.filter((t) => ids.has(t.id));
}
