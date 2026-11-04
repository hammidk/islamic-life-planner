import { describe, expect, it } from 'vitest';
import { normalize } from '../utils/userData';

describe('нормализация пунктов', () => {
  it('старые пункты без parentId и note не ломаются', () => {
    const snap = normalize({
      tasks: [],
      checklists: { fajr: [{ id: 'a', title: 'Азкары', done: true }, { id: 'b', title: 'Дуа' }] }
    })!;
    expect(snap.checklists.fajr).toEqual([
    { id: 'a', title: 'Азкары', done: true },
    { id: 'b', title: 'Дуа', done: false }]
    );
    expect('parentId' in snap.checklists.fajr[0]).toBe(false);
  });

  it('новые поля сохраняются, мусор выбрасывается', () => {
    const snap = normalize({
      checklists: {
        isha: [
        { id: 'a', title: 'Коран', done: false, note: 'Сура Аль-Мульк' },
        { id: 'b', title: 'Аят', done: false, parentId: 'a' },
        { id: 'c', title: 'Битый', done: false, parentId: 5, note: null },
        { title: 'без id' },
        null],

        broken: 'x'
      }
    })!;
    expect(snap.checklists.isha).toEqual([
    { id: 'a', title: 'Коран', done: false, note: 'Сура Аль-Мульк' },
    { id: 'b', title: 'Аят', done: false, parentId: 'a' },
    { id: 'c', title: 'Битый', done: false }]
    );
    expect(snap.checklists.broken).toEqual([]);
    expect(normalize({ checklists: 7 })!.checklists).toEqual({});
  });
});
