import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createSphere, deleteSphere, mergeSpheres, normalizeCustomSpheres, resolveSphere, sphereContents, updateSphere } from '../utils/spheres';
import { emptySnapshot, normalize } from '../utils/userData';
import { BUILTIN_SPHERES, MAX_CUSTOM_SPHERES, SPHERE_COLORS } from '../data/spheres';
import { useSpheres } from '../hooks/useSpheres';
import type { CustomSphere, Task } from '../types';

const make = (name: string, custom: CustomSphere[] = []) => {
  const r = createSphere(custom, { name, icon: 'book', color: 'teal' }, new Date('2026-11-04T10:00:00Z'));
  if (!r.ok) throw new Error(r.reason);
  return r;
};

const task = (id: string, sphere: string, patch: Partial<Task> = {}): Task => ({
  id, title: id, sphere, period: 'untilDhuhr', status: 'open', ...patch
});

describe('сферы: список и getSphere', () => {
  it('встроенные с прежними id, затем пользовательские по order', () => {
    expect(BUILTIN_SPHERES.map((s) => s.id)).toEqual(['faith', 'rizq', 'health', 'family', 'ideas', 'other']);
    const a = make('Учёба');
    const b = make('Спорт', a.custom);
    const custom = b.custom.map((c) => c.name === 'Учёба' ? { ...c, order: 5 } : c);
    expect(mergeSpheres(custom).map((s) => s.name).slice(6)).toEqual(['Спорт', 'Учёба']);
  });

  it('getSphere: известный id — своя сфера, неизвестный (удалённая) — «Прочее»', () => {
    const { custom, id } = make('Учёба');
    const list = mergeSpheres(custom);
    expect(resolveSphere(list, 'rizq').name).toBe('Удел');
    expect(resolveSphere(list, id)).toEqual({ id, name: 'Учёба', icon: 'book', color: SPHERE_COLORS.teal });
    expect(resolveSphere(list, 'c_deleted').id).toBe('other');
    expect(resolveSphere(list, undefined).id).toBe('other');
  });

  it('useSpheres вне AppProvider — только встроенные', () => {
    const { result } = renderHook(() => useSpheres());
    expect(result.current.spheres).toHaveLength(6);
    expect(result.current.getSphere('nope').name).toBe('Прочее');
  });
});

describe('создание и изменение', () => {
  it('id вида c_…, название обрезается, до 24 символов', () => {
    const { custom, id } = make('   Очень   длинное название сферы жизни  ');
    expect(id).toMatch(/^c_[a-z0-9]+$/);
    expect(custom[0].name).toBe('Очень длинное название с');
    expect(custom[0].name.length).toBeLessThanOrEqual(24);
    expect(custom[0].order).toBe(0);
    expect(custom[0].createdAt).toBe('2026-11-04T10:00:00.000Z');
  });

  it('пустое и повторы (без учёта регистра, и со встроенными) — нельзя', () => {
    const { custom } = make('Учёба');
    expect(createSphere(custom, { name: '   ', icon: 'book', color: 'teal' })).toEqual({ ok: false, reason: 'empty' });
    expect(createSphere(custom, { name: 'УЧЁБА ', icon: 'book', color: 'teal' })).toEqual({ ok: false, reason: 'duplicate' });
    expect(createSphere(custom, { name: 'здоровье', icon: 'book', color: 'teal' })).toEqual({ ok: false, reason: 'duplicate' });
  });

  it('не больше 12 пользовательских сфер', () => {
    let custom: CustomSphere[] = [];
    for (let i = 0; i < MAX_CUSTOM_SPHERES; i++) custom = make(`Сфера ${i}`, custom).custom;
    expect(custom).toHaveLength(12);
    expect(createSphere(custom, { name: 'Тринадцатая', icon: 'book', color: 'teal' })).toEqual({ ok: false, reason: 'limit' });
  });

  it('изменить можно только свою; своё же название — не повтор', () => {
    const { custom, id } = make('Учёба');
    const r = updateSphere(custom, id, { name: 'учёба', icon: 'code', color: 'plum' });
    expect(r.ok && r.custom[0]).toMatchObject({ name: 'учёба', icon: 'code', color: 'plum' });
    expect(updateSphere(custom, 'rizq', { name: 'Работа', icon: 'code', color: 'plum' })).toEqual({ ok: false, reason: 'builtin' });
  });
});

describe('удаление сферы', () => {
  it('дела и разделы переезжают в «Прочее», ничего не удаляется', () => {
    const { custom, id } = make('Учёба');
    const data = {
      custom,
      tasks: [task('t1', id, { sectionId: 's1' }), task('t2', id), task('t3', 'rizq')],
      sections: [{ id: 's1', sphere: id, title: 'Курсы' }, { id: 's2', sphere: 'rizq', title: 'Работа' }],
      sphereSlots: { [id]: { start: '10:00', duration: 30 } }
    };
    expect(sphereContents(data, id)).toEqual({ tasks: 2, sections: 1 });
    const next = deleteSphere(data, id)!;
    expect(next.custom).toEqual([]);
    expect(next.tasks.map((t) => [t.id, t.sphere, t.sectionId])).toEqual([['t1', 'other', 's1'], ['t2', 'other', undefined], ['t3', 'rizq', undefined]]);
    expect(next.sections).toEqual([{ id: 's1', sphere: 'other', title: 'Курсы' }, { id: 's2', sphere: 'rizq', title: 'Работа' }]);
    expect(next.sphereSlots).toEqual({});
    expect(deleteSphere(data, 'faith')).toBeNull();
  });
});

describe('нормализация', () => {
  it('старые данные без customSpheres читаются как есть', () => {
    const snap = normalize({ tasks: [task('t1', 'faith')], sections: [] })!;
    expect(snap.customSpheres).toEqual([]);
    expect(snap.tasks[0].sphere).toBe('faith');
  });

  it('мусор отбрасывается, неизвестные иконка и цвет — по умолчанию', () => {
    expect(
      normalizeCustomSpheres([
      { id: 'c_ok1', name: 'Учёба', icon: 'book', color: 'teal', order: 2, createdAt: 'x' },
      { id: 'c_ok2', name: '  Спорт ', icon: 'rocket', color: '#ff0000' },
      { id: 'c_dup', name: 'учёба', icon: 'book', color: 'teal' },
      { id: 'c_ok1', name: 'Другое имя' },
      { id: 'c_noname', name: '   ' },
      { name: 'без id' },
      { id: 'faith', name: 'Подмена встроенной' },
      'строка',
      null]
      )
    ).toEqual([
    { id: 'c_ok1', name: 'Учёба', icon: 'book', color: 'teal', order: 2, createdAt: 'x' },
    { id: 'c_ok2', name: 'Спорт', icon: 'layers', color: 'green', order: 1, createdAt: '' }]
    );
    expect(normalizeCustomSpheres({ a: 1 })).toEqual([]);
  });

  it('полный круг: создать, сохранить, загрузить через нормализацию', () => {
    const a = make('Учёба');
    const b = make('Спорт', a.custom);
    const saved = JSON.parse(JSON.stringify({ ...emptySnapshot(), customSpheres: b.custom, tasks: [task('t1', a.id)] }));
    const loaded = normalize(saved)!;
    expect(loaded.customSpheres).toEqual(b.custom);
    expect(resolveSphere(mergeSpheres(loaded.customSpheres), loaded.tasks[0].sphere).name).toBe('Учёба');
  });
});
