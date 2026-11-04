import { addDays, format, parseISO } from 'date-fns';
import type { PlanItem, PlanWindow } from './todayPlan';

export type MovableBlock = 'rizq' | 'other';

/** afterId — элемент расписания, после которого стоит блок; null — в самое начало */
export interface BlockSpot {
  afterId: string | null;
}

/** положение блоков по датам: действует только сегодня, завтра блок снова встаёт сам */
export type BlockPlacement = Record<string, Partial<Record<MovableBlock, BlockSpot>>>;

/** сколько дней хранить старые записи */
export const PLACEMENT_KEEP_DAYS = 7;

/** id элемента расписания — устойчивый между перерисовками */
export function planItemId(windowId: string, item: PlanItem): string {
  switch (item.kind) {
    case 'prayer':
      return `prayer:${windowId}`;
    case 'dayEnd':
      return 'dayEnd';
    case 'task':
      return `task:${item.task.id}`;
    case 'list':
      return `list:${item.sphere}`;
    case 'free':
      return `free:${windowId}:${item.start}`;
  }
}

/** «Свободно» сдвигается со временем — опорой для блока не годится */
const isStable = (id: string) => !id.startsWith('free:');

const blockId = (sphere: MovableBlock) => `list:${sphere}`;

const isMovable = (item: PlanItem, sphere: MovableBlock) =>
item.kind === 'list' && item.sphere === sphere && !item.slot;

/**
 * Ставит «Удел» и «Прочее» (без времени в расписании) туда, куда их перенесли сегодня.
 * Работает поверх результата buildTodayPlan, его самого не меняет. Если опорный элемент
 * исчез (дело выполнено, намаз отмечен), блок стоит на автоматическом месте.
 */
export function applyPlacement(
plan: PlanWindow[],
today: Partial<Record<MovableBlock, BlockSpot>> | undefined)
: PlanWindow[] {
  const windows = plan.map((w) => ({ ...w, items: [...w.items] }));
  if (!today || windows.length === 0) return windows;
  (['rizq', 'other'] as MovableBlock[]).forEach((sphere) => {
    const spot = today[sphere];
    if (!spot) return;
    const from = windows.find((w) => w.items.some((i) => isMovable(i, sphere)));
    if (!from) return;
    const item = from.items.find((i) => isMovable(i, sphere)) as PlanItem;

    let target: PlanWindow | undefined;
    let at = 0;
    if (spot.afterId === null) {
      target = windows[0];
    } else {
      if (spot.afterId === blockId(sphere)) return;
      target = windows.find((w) => w.items.some((i) => planItemId(w.id, i) === spot.afterId));
      if (!target) return;
    }
    from.items = from.items.filter((i) => i !== item);
    if (spot.afterId !== null) {
      at = target.items.findIndex((i) => planItemId(target!.id, i) === spot.afterId) + 1;
    }
    target.items.splice(at, 0, item);
  });
  return windows;
}

/** Порядок элементов расписания одной строкой (для «Поднять»/«Опустить») */
export function flattenPlan(plan: PlanWindow[]): string[] {
  return plan.flatMap((w) => w.items.map((i) => planItemId(w.id, i)));
}

/**
 * Новое положение блока на шаг выше или ниже, по уже применённому расписанию.
 * undefined — двигать некуда.
 */
export function shiftPlacement(order: string[], sphere: MovableBlock, dir: 'up' | 'down'): BlockSpot | undefined {
  const stable = order.filter(isStable);
  const index = stable.indexOf(blockId(sphere));
  if (index === -1) return undefined;
  if (dir === 'up') {
    if (index === 0) return undefined;
    const before = stable.slice(0, index - 1).filter((id) => id !== blockId(sphere));
    return { afterId: before.length > 0 ? before[before.length - 1] : null };
  }
  if (index === stable.length - 1) return undefined;
  return { afterId: stable[index + 1] };
}

/**
 * Куда встанет блок, отпущенный на высоте y: перед первым элементом, середина которого
 * ниже пальца. rects — элементы расписания по порядку, без самого блока.
 */
export function placementFromPoint(rects: {id: string;top: number;bottom: number;}[], y: number): {spot: BlockSpot;lineY: number;} {
  const next = rects.findIndex((r) => (r.top + r.bottom) / 2 > y);
  const prevIndex = next === -1 ? rects.length - 1 : next - 1;
  let anchor = prevIndex;
  while (anchor >= 0 && !isStable(rects[anchor].id)) anchor -= 1;
  const lineY =
  next === -1 ?
  rects.length > 0 ? rects[rects.length - 1].bottom : y :
  prevIndex >= 0 ?
  (rects[prevIndex].bottom + rects[next].top) / 2 :
  rects[next].top;
  return { spot: { afterId: anchor >= 0 ? rects[anchor].id : null }, lineY };
}

/** Записи за сегодня и последние дни; всё старше 7 дней и мусор — выбрасываются */
export function prunePlacement(raw: unknown, today: string, keepDays = PLACEMENT_KEEP_DAYS): BlockPlacement {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  let oldest: string;
  try {
    oldest = format(addDays(parseISO(today), -keepDays), 'yyyy-MM-dd');
  } catch {
    return {};
  }
  const out: BlockPlacement = {};
  Object.entries(raw as Record<string, unknown>).forEach(([date, day]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < oldest || !day || typeof day !== 'object') return;
    const spots: Partial<Record<MovableBlock, BlockSpot>> = {};
    (['rizq', 'other'] as MovableBlock[]).forEach((sphere) => {
      const spot = (day as Record<string, unknown>)[sphere];
      if (spot && typeof spot === 'object') {
        const afterId = (spot as Record<string, unknown>).afterId;
        if (afterId === null || typeof afterId === 'string') spots[sphere] = { afterId };
      }
    });
    if (Object.keys(spots).length > 0) out[date] = spots;
  });
  return out;
}
