import { PRAYER_IDS } from '../data/appData';
import type { Task } from '../types';
import type { UserSnapshot } from './userData';

/** id задачи, в которую превратился старый пункт намаза: одинаковый при каждом запуске */
export const migratedTaskId = (prayerId: string, itemId: string) => `pt_${prayerId}_${itemId}`;

/**
 * Один раз при загрузке: старые пункты чек-листов намазов становятся задачами блока
 * (prayerId, сфера «Вера», дата начала — сегодня). Отметки пунктов никогда не сбрасывались,
 * поэтому повтора нет; отмеченный пункт — выполненная задача (дата отметки неизвестна,
 * в doneDates не переносится). Исходные пункты не удаляются. Повторный запуск ничего не
 * меняет: флаг prayerItemsMigrated и постоянные id задач.
 */
export function migratePrayerItems(snap: UserSnapshot, today: string): UserSnapshot {
  if (snap.prayerItemsMigrated) return snap;
  const existing = new Set(snap.tasks.map((t) => t.id));
  const created: Task[] = [];
  PRAYER_IDS.forEach((prayerId) => {
    const items = snap.checklists[prayerId] ?? [];
    const ids = new Set(items.map((i) => i.id));
    items.forEach((item, index) => {
      const id = migratedTaskId(prayerId, item.id);
      const title = item.title.trim();
      if (existing.has(id) || !title) return;
      const task: Task = {
        id,
        title,
        sphere: 'faith',
        period: 'untilDhuhr',
        status: item.done ? 'done' : 'open',
        date: today,
        prayerId,
        order: index
      };
      if (item.note) task.description = item.note;
      if (item.parentId && ids.has(item.parentId)) task.parentId = migratedTaskId(prayerId, item.parentId);
      created.push(task);
    });
  });
  return { ...snap, tasks: [...snap.tasks, ...created], prayerItemsMigrated: true };
}
