/** Пороги жестов строки дела */
export const AXIS_SLOP = 10;
/** горизонтальный жест — только если |dx| > |dy| × 1.5 */
export const AXIS_RATIO = 1.5;
export const SWIPE_THRESHOLD = 64;
/** px/мс */
export const FLICK_VELOCITY = 0.5;
/** полный свайп влево — доля ширины строки */
export const FULL_SWIPE_RATIO = 0.55;
export const LONG_PRESS_MS = 350;
/** сдвиг пальца, после которого долгое нажатие уже не считается */
export const LONG_PRESS_TOLERANCE = 8;

export type Axis = 'x' | 'y';

/**
 * Ось жеста: null — палец ещё не ушёл дальше 10 px. 'x' — только при явном перевесе
 * горизонтали, иначе 'y' и строка жест не перехватывает (скроллится страница).
 */
export function lockAxis(dx: number, dy: number): Axis | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < AXIS_SLOP && ay < AXIS_SLOP) return null;
  return ax >= AXIS_SLOP && ax > ay * AXIS_RATIO ? 'x' : 'y';
}

/**
 * Итог горизонтального жеста:
 * indent — свайп вправо (сделать подзадачей), reveal — открыть кнопки слева,
 * delete — полный свайп влево, none — пружина назад.
 * velocity — скорость по x со знаком, px/мс.
 */
export type SwipeResult = 'none' | 'indent' | 'reveal' | 'delete';

export function resolveSwipe(dx: number, dy: number, velocity: number, width = 375): SwipeResult {
  if (lockAxis(dx, dy) !== 'x') return 'none';
  if (dx > 0) return dx >= SWIPE_THRESHOLD || velocity > FLICK_VELOCITY ? 'indent' : 'none';
  if (-dx > width * FULL_SWIPE_RATIO) return 'delete';
  return -dx >= SWIPE_THRESHOLD || velocity < -FLICK_VELOCITY ? 'reveal' : 'none';
}

/**
 * Жест по уже открытой строке (видны кнопки): вправо — закрыть,
 * полный свайп влево — удалить, иначе строка остаётся открытой.
 */
export function resolveOpenSwipe(dx: number, dy: number, velocity: number, width = 375): 'close' | 'stay' | 'delete' {
  if (lockAxis(dx, dy) !== 'x') return 'stay';
  if (dx > 0) return dx >= SWIPE_THRESHOLD / 2 || velocity > FLICK_VELOCITY ? 'close' : 'stay';
  return -dx > width * FULL_SWIPE_RATIO ? 'delete' : 'stay';
}

/** Сопротивление за пределом: чем дальше, тем медленнее едет строка */
export function rubber(value: number, limit: number): number {
  if (Math.abs(value) <= limit) return value;
  const over = Math.abs(value) - limit;
  return Math.sign(value) * (limit + over * 0.25);
}
