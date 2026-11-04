import { describe, expect, it } from 'vitest';
import { occursOn } from '../utils/occurrence';
import type { RepeatRule, Task } from '../types';

const task = (date: string | undefined, repeat?: RepeatRule): Task => ({
  id: 't', title: 't', sphere: 'other', period: 'untilDhuhr', status: 'open', date, repeat
});

// ноябрь 2026: 02 — Пн, 03 — Вт, 04 — Ср, 06 — Пт, 07 — Сб, 08 — Вс
describe('occursOn', () => {
  const mwf = task('2026-11-02', { kind: 'weekdays', days: [0, 2, 4] });
  it.each([
  ['2026-11-02', true], // понедельник, дата начала
  ['2026-11-03', false], // вторник
  ['2026-11-04', true], // среда
  ['2026-11-06', true], // пятница
  ['2026-11-08', false], // воскресенье
  ['2026-10-30', false], // пятница, но до даты начала
  ['2026-12-14', true] // понедельник через месяц
  ])('Пн/Ср/Пт: %s → %s', (day, expected) => expect(occursOn(mwf, day)).toBe(expected));

  it('каждый день — с даты начала', () => {
    const t = task('2026-11-04', { kind: 'daily' });
    expect(occursOn(t, '2026-11-03')).toBe(false);
    expect(occursOn(t, '2026-11-04')).toBe(true);
    expect(occursOn(t, '2027-01-01')).toBe(true);
  });

  it('по будням', () => {
    const t = task('2026-11-01', { kind: 'weekdays', days: [0, 1, 2, 3, 4] });
    expect(['2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09'].map((d) => occursOn(t, d))).toEqual([true, false, false, true]);
  });

  it('каждую неделю — тот же день недели; каждые 2 недели — через неделю', () => {
    const weekly = task('2026-11-04', { kind: 'weeks', every: 1 });
    expect(['2026-11-11', '2026-11-12', '2026-10-28'].map((d) => occursOn(weekly, d))).toEqual([true, false, false]);
    const biweekly = task('2026-11-04', { kind: 'weeks', every: 2 });
    expect(['2026-11-11', '2026-11-18', '2026-12-02'].map((d) => occursOn(biweekly, d))).toEqual([false, true, true]);
  });

  it('каждый месяц — то же число; 31-е в коротком месяце — последний день месяца', () => {
    const t = task('2026-01-31', { kind: 'monthly' });
    expect(occursOn(t, '2026-02-28')).toBe(true);
    expect(occursOn(t, '2026-02-27')).toBe(false);
    expect(occursOn(t, '2026-03-31')).toBe(true);
    expect(occursOn(t, '2026-04-30')).toBe(true);
    expect(occursOn(t, '2026-03-30')).toBe(false);
    expect(occursOn(task('2026-01-15', { kind: 'monthly' }), '2026-02-15')).toBe(true);
    // високосный год: 29-е
    expect(occursOn(task('2027-01-30', { kind: 'monthly' }), '2028-02-29')).toBe(true);
  });

  it('неповторяющееся — только своя дата; без даты — никогда', () => {
    expect(occursOn(task('2026-11-04'), '2026-11-04')).toBe(true);
    expect(occursOn(task('2026-11-04'), '2026-11-05')).toBe(false);
    expect(occursOn(task('2026-11-04', { kind: 'none' }), '2026-11-04')).toBe(true);
    expect(occursOn(task(undefined), '2026-11-04')).toBe(false);
  });

  it('повтор без даты начала — каждый подходящий день; пустой список дней — никогда', () => {
    expect(occursOn(task(undefined, { kind: 'weekdays', days: [0] }), '2026-11-02')).toBe(true);
    expect(occursOn(task(undefined, { kind: 'weekdays', days: [0] }), '2026-11-03')).toBe(false);
    expect(occursOn(task('2026-11-02', { kind: 'weekdays', days: [] }), '2026-11-02')).toBe(false);
  });

  it('отменённое дело не появляется', () => {
    expect(occursOn({ ...task('2026-11-04', { kind: 'daily' }), status: 'cancelled' }, '2026-11-05')).toBe(false);
  });
});
