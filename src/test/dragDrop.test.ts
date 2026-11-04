import { describe, expect, it } from 'vitest';
import { arrayMove, dropLineSide, resolveDrop } from '../utils/dragDrop';

const yes = () => true;
const no = () => false;

describe('перетаскивание: что делать при отпускании', () => {
  it('отпустили на месте после долгого нажатия — меню', () => {
    expect(resolveDrop(2, 2, 3, -4, yes)).toEqual({ kind: 'menu' });
  });

  it('перестановка внутри списка', () => {
    expect(resolveDrop(0, 3, 0, 160, yes)).toEqual({ kind: 'reorder', from: 0, to: 3 });
    expect(resolveDrop(3, 1, 2, -90, yes)).toEqual({ kind: 'reorder', from: 3, to: 1 });
    expect(resolveDrop(1, 1, 0, 20, yes)).toEqual({ kind: 'none' });
    expect(resolveDrop(1, -1, 0, 400, yes)).toEqual({ kind: 'none' });
  });

  it('сдвиг вправо больше 40 px над строкой — подзадача этой строки', () => {
    expect(resolveDrop(3, 1, 52, -80, yes)).toEqual({ kind: 'nest', parentIndex: 1 });
    // 40 px — ещё перестановка
    expect(resolveDrop(3, 1, 40, -80, yes)).toEqual({ kind: 'reorder', from: 3, to: 1 });
    // вложить нельзя (у дела подзадачи / цель — подзадача) — обычная перестановка
    expect(resolveDrop(3, 1, 60, -80, no)).toEqual({ kind: 'reorder', from: 3, to: 1 });
  });

  it('линия места вставки и порядок', () => {
    expect(dropLineSide(0, 2)).toBe('after');
    expect(dropLineSide(2, 0)).toBe('before');
    expect(dropLineSide(1, 1)).toBeNull();
    expect(arrayMove(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(arrayMove(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });
});
