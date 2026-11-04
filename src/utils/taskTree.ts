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

const childrenOf = (tasks: Task[], id: string) =>
tasks.filter((t) => t.parentId === id && t.status !== 'cancelled');

/** Почему нельзя сделать подзадачей; null — можно */
export type TreeRefusal = 'noAbove' | 'tooDeep' | 'hasChildren' | 'cycle' | 'missing';

export const refusalText: Record<TreeRefusal, string> = {
  noAbove: 'Нет дела выше',
  tooDeep: 'Глубже нельзя',
  hasChildren: 'У дела есть подзадачи',
  cycle: 'Нельзя вложить дело в его подзадачу',
  missing: 'Дело не найдено'
};

/**
 * Можно ли сделать дело id подзадачей newParentId. Уровней максимум два:
 * подзадача не получает своих подзадач, дело со своими подзадачами не вкладывается.
 */
export function canMoveUnder(tasks: Task[], id: string, newParentId: string | undefined): TreeRefusal | null {
  if (!newParentId) return 'noAbove';
  const task = tasks.find((t) => t.id === id);
  const parent = tasks.find((t) => t.id === newParentId);
  if (!task || !parent) return 'missing';
  if (id === newParentId || collectSubtree(tasks, id).some((t) => t.id === newParentId)) return 'cycle';
  if (childrenOf(tasks, id).length > 0) return 'hasChildren';
  if (parent.parentId && tasks.some((t) => t.id === parent.parentId)) return 'tooDeep';
  return null;
}

/**
 * Свайп вправо: дело становится подзадачей дела, стоящего непосредственно выше в списке.
 * aboveId — верхнеуровневое дело над строкой (или его группа); undefined — выше ничего нет.
 */
export function canIndent(tasks: Task[], id: string, aboveId: string | undefined): TreeRefusal | null {
  const task = tasks.find((t) => t.id === id);
  if (task?.parentId && tasks.some((t) => t.id === task.parentId)) return 'tooDeep';
  return canMoveUnder(tasks, id, aboveId);
}

export type TreeResult = {ok: true;tasks: Task[];} | {ok: false;reason: TreeRefusal;};

/**
 * Делает дело подзадачей: наследует сферу и раздел родителя (дата, время, повтор
 * и заметка остаются свои) и встаёт последней подзадачей.
 */
export function moveUnder(tasks: Task[], id: string, newParentId: string): TreeResult {
  const reason = canMoveUnder(tasks, id, newParentId);
  if (reason) return { ok: false, reason };
  const parent = tasks.find((t) => t.id === newParentId) as Task;
  const siblings = childrenOf(tasks, newParentId).filter((t) => t.id !== id);
  const order = siblings.reduce((max, t) => Math.max(max, t.order ?? 0), parent.order ?? 0) + 1;
  return {
    ok: true,
    tasks: tasks.map((t) =>
    t.id === id ? { ...t, parentId: newParentId, sphere: parent.sphere, sectionId: parent.sectionId, order } : t
    )
  };
}

export function indent(tasks: Task[], id: string, aboveId: string | undefined): TreeResult {
  const reason = canIndent(tasks, id, aboveId);
  if (reason) return { ok: false, reason };
  return moveUnder(tasks, id, aboveId as string);
}

/**
 * «Вынести»: подзадача становится обычным делом сразу после бывшего родителя
 * (между ним и следующим делом того же списка).
 */
export function outdent(tasks: Task[], id: string): Task[] {
  const task = tasks.find((t) => t.id === id);
  if (!task?.parentId) return tasks;
  const parent = tasks.find((t) => t.id === task.parentId);
  if (!parent) return tasks.map((t) => t.id === id ? { ...t, parentId: undefined } : t);
  const base = parent.order ?? 0;
  const next = tasks.
  filter(
    (t) =>
    t.id !== id &&
    t.id !== parent.id &&
    !t.parentId &&
    t.sphere === parent.sphere &&
    (t.sectionId ?? '') === (parent.sectionId ?? '') &&
    (t.order ?? 0) > base
  ).
  reduce<number | null>((min, t) => min === null ? t.order ?? 0 : Math.min(min, t.order ?? 0), null);
  const order = next === null ? base + 1 : (base + next) / 2;
  return tasks.map((t) => t.id === id ? { ...t, parentId: undefined, order } : t);
}

/** Строка списка: верхнее дело и его подзадачи из этого же списка */
export interface TaskNode {
  task: Task;
  children: Task[];
  /** подзадача, чей родитель в другом списке: подпись «↳ Название родителя» */
  parentTitle?: string;
}

/**
 * Раскладывает список в дерево. Подзадача стоит под родителем, если он верхнего уровня
 * в этом же списке; иначе показывается самостоятельно с подписью родителя. Ни одно дело
 * не теряется: и при третьем уровне, и при зацикленных parentId в старых данных.
 */
export function buildTaskTree(list: Task[], all: Task[] = list): TaskNode[] {
  const inList = new Map(list.map((t) => [t.id, t]));
  const isNested = (t: Task) => {
    const parent = t.parentId ? inList.get(t.parentId) : undefined;
    if (!parent || parent.id === t.id) return false;
    // родитель сам вложен — значит это третий уровень или цикл: показываем отдельно
    const grand = parent.parentId ? inList.get(parent.parentId) : undefined;
    return !grand || grand.id === parent.id;
  };
  const nodes: TaskNode[] = [];
  const byId = new Map<string, TaskNode>();
  list.forEach((t) => {
    if (isNested(t)) return;
    const parent = t.parentId ? all.find((p) => p.id === t.parentId) : undefined;
    const node: TaskNode = { task: t, children: [], parentTitle: parent ? parent.title : undefined };
    nodes.push(node);
    byId.set(t.id, node);
  });
  list.forEach((t) => {
    if (isNested(t)) byId.get(t.parentId as string)?.children.push(t);
  });
  return nodes;
}

/** Кандидаты в родители для «Сделать подзадачей…»: без самого дела, его подзадач и подзадач вообще */
export function parentCandidates(tasks: Task[], id: string): Task[] {
  const own = new Set(collectSubtree(tasks, id).map((t) => t.id));
  const ids = new Set(tasks.map((t) => t.id));
  return tasks.filter(
    (t) =>
    !own.has(t.id) &&
    t.status !== 'cancelled' &&
    t.status !== 'done' &&
    !(t.parentId && ids.has(t.parentId))
  );
}
