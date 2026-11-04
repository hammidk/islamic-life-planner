/** сдвиг пальца вправо при перетаскивании, после которого строка встаёт подзадачей */
export const NEST_OFFSET = 40;
/** перетаскивание без движения — это долгое нажатие: меню */
export const STILL_DISTANCE = 8;

export type DropIntent =
{kind: 'menu';} |
{kind: 'none';} |
{kind: 'reorder';from: number;to: number;} |
{kind: 'nest';parentIndex: number;};

/**
 * Что сделать, когда строку отпустили.
 * dx, dy — смещение пальца; overIndex — строка под пальцем (-1 — мимо списка).
 */
export function resolveDrop(
activeIndex: number,
overIndex: number,
dx: number,
dy: number,
canNest: (overIndex: number) => boolean)
: DropIntent {
  if (Math.abs(dx) < STILL_DISTANCE && Math.abs(dy) < STILL_DISTANCE) return { kind: 'menu' };
  if (overIndex < 0) return { kind: 'none' };
  if (dx > NEST_OFFSET && overIndex !== activeIndex && canNest(overIndex)) return { kind: 'nest', parentIndex: overIndex };
  if (overIndex === activeIndex) return { kind: 'none' };
  return { kind: 'reorder', from: activeIndex, to: overIndex };
}

/** где рисовать линию места вставки у строки под пальцем */
export function dropLineSide(activeIndex: number, overIndex: number): 'before' | 'after' | null {
  if (overIndex < 0 || overIndex === activeIndex) return null;
  return overIndex > activeIndex ? 'after' : 'before';
}

export function arrayMove<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
