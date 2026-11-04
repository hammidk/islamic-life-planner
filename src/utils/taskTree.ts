import type { Task } from '../types';

/** Любой узел дерева: дело или пункт чек-листа */
export interface TreeNode {
  id: string;
  parentId?: string;
  title?: string;
  status?: string;
}

/** Узел и все его потомки (на любой глубине, без зацикливания) */
export function collectSubtree<T extends TreeNode>(tasks: T[], id: string): T[] {
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

const childrenOf = <T extends TreeNode,>(tasks: T[], id: string) =>
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
export function canMoveUnder<T extends TreeNode>(tasks: T[], id: string, newParentId: string | undefined): TreeRefusal | null {
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
export function canIndent<T extends TreeNode>(tasks: T[], id: string, aboveId: string | undefined): TreeRefusal | null {
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
    t.id === id ?
    // подзадача задачи намаза остаётся в его блоке
    { ...t, parentId: newParentId, sphere: parent.sphere, sectionId: parent.sectionId, prayerId: parent.prayerId, order } :
    t
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

/** Строка списка: верхний узел и его потомки из этого же списка */
export interface TaskNode<T extends TreeNode = Task> {
  task: T;
  children: T[];
  /** подзадача, чей родитель в другом списке: подпись «↳ Название родителя» */
  parentTitle?: string;
}

/**
 * Раскладывает список в дерево. Подзадача стоит под родителем, если он верхнего уровня
 * в этом же списке; иначе показывается самостоятельно с подписью родителя. Ни одно дело
 * не теряется: и при третьем уровне, и при зацикленных parentId в старых данных.
 */
export function buildTaskTree<T extends TreeNode = Task>(list: T[], all: T[] = list): TaskNode<T>[] {
  const inList = new Map(list.map((t) => [t.id, t]));
  const isNested = (t: T) => {
    const parent = t.parentId ? inList.get(t.parentId) : undefined;
    if (!parent || parent.id === t.id) return false;
    // родитель сам вложен — значит это третий уровень или цикл: показываем отдельно
    const grand = parent.parentId ? inList.get(parent.parentId) : undefined;
    return !grand || grand.id === parent.id;
  };
  const nodes: TaskNode<T>[] = [];
  const byId = new Map<string, TaskNode<T>>();
  list.forEach((t) => {
    if (isNested(t)) return;
    const parent = t.parentId ? all.find((p) => p.id === t.parentId) : undefined;
    const node: TaskNode<T> = { task: t, children: [], parentTitle: parent ? parent.title : undefined };
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

/* ---------- узлы, у которых порядок — это порядок в массиве (пункты чек-листа) ---------- */

/** Дерево обратно в массив: узел, затем его потомки */
export function flattenTree<T extends TreeNode>(nodes: TaskNode<T>[]): T[] {
  return nodes.flatMap((n) => [n.task, ...n.children]);
}

/** Индекс сразу после узла и всех его потомков */
const blockEnd = <T extends TreeNode,>(items: T[], id: string): number => {
  const ids = new Set(collectSubtree(items, id).map((i) => i.id));
  let end = items.findIndex((i) => i.id === id);
  items.forEach((i, index) => {
    if (ids.has(i.id)) end = Math.max(end, index);
  });
  return end + 1;
};

export type NodesResult<T> = {ok: true;items: T[];} | {ok: false;reason: TreeRefusal;};

/** Сделать подпунктом aboveId: правила как у дел, пункт встаёт последним подпунктом */
export function indentNode<T extends TreeNode>(items: T[], id: string, aboveId: string | undefined): NodesResult<T> {
  const reason = canIndent(items, id, aboveId);
  if (reason) return { ok: false, reason };
  const item = items.find((i) => i.id === id) as T;
  const rest = items.filter((i) => i.id !== id);
  const at = blockEnd(rest, aboveId as string);
  return { ok: true, items: [...rest.slice(0, at), { ...item, parentId: aboveId }, ...rest.slice(at)] };
}

/** «Вынести»: подпункт становится пунктом сразу после бывшего родителя и его подпунктов */
export function outdentNode<T extends TreeNode>(items: T[], id: string): T[] {
  const item = items.find((i) => i.id === id);
  if (!item?.parentId) return items;
  const parentId = item.parentId;
  const rest = items.filter((i) => i.id !== id);
  const plain = { ...item };
  delete plain.parentId;
  if (!rest.some((i) => i.id === parentId)) return items.map((i) => i.id === id ? plain : i);
  const at = blockEnd(rest, parentId);
  return [...rest.slice(0, at), plain, ...rest.slice(at)];
}

/** Вставить новый узел после afterId: соседом того же уровня, после его потомков */
export function insertNodeAfter<T extends TreeNode>(items: T[], afterId: string | undefined, node: T): T[] {
  const anchor = afterId ? items.find((i) => i.id === afterId) : undefined;
  if (!anchor) return [...items, node];
  const next = anchor.parentId ? { ...node, parentId: anchor.parentId } : node;
  const at = blockEnd(items, anchor.id);
  return [...items.slice(0, at), next, ...items.slice(at)];
}

export interface RemovedNodes<T> {
  items: T[];
  /** для «Отменить»: что и на каких местах стояло */
  removed: {item: T;index: number;}[];
}

/** Удалить узел вместе с потомками */
export function removeNode<T extends TreeNode>(items: T[], id: string): RemovedNodes<T> {
  const ids = new Set(collectSubtree(items, id).map((i) => i.id));
  const removed = items.map((item, index) => ({ item, index })).filter((r) => ids.has(r.item.id));
  return { items: items.filter((i) => !ids.has(i.id)), removed };
}

/** Вернуть удалённое на прежние места */
export function restoreNodes<T extends TreeNode>(items: T[], removed: {item: T;index: number;}[]): T[] {
  const next = items.filter((i) => !removed.some((r) => r.item.id === i.id));
  [...removed].sort((a, b) => a.index - b.index).forEach((r) => next.splice(Math.min(r.index, next.length), 0, r.item));
  return next;
}

/** Новый порядок соседей одного уровня (ids — их id по порядку); потомки едут с родителем */
export function reorderNodes<T extends TreeNode>(items: T[], ids: string[]): T[] {
  const nodes = buildTaskTree(items);
  const rank = (id: string) => ids.indexOf(id);
  const sortGroup = (group: T[]) => {
    const moving = group.filter((g) => rank(g.id) !== -1);
    if (moving.length === 0) return group;
    const sorted = [...moving].sort((a, b) => rank(a.id) - rank(b.id));
    let k = 0;
    return group.map((g) => rank(g.id) === -1 ? g : sorted[k++]);
  };
  const tops = sortGroup(nodes.map((n) => n.task));
  const byId = new Map(nodes.map((n) => [n.task.id, n]));
  return flattenTree(tops.map((t) => {
    const n = byId.get(t.id) as TaskNode<T>;
    return { ...n, children: sortGroup(n.children) };
  }));
}
