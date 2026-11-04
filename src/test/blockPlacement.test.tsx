import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appState, makeTask, renderApp } from './renderApp';
import { TEST_TODAY } from './setup';
import {
  applyPlacement,
  flattenPlan,
  placementFromPoint,
  prunePlacement,
  shiftPlacement } from
'../utils/blockPlacement';
import type { PlanWindow } from '../utils/todayPlan';
import type { Task } from '../types';

const task = (id: string): Task => ({ id, title: id, sphere: 'other', period: 'untilDhuhr', status: 'open' });
const win = (id: string, items: PlanWindow['items'], isActive = false): PlanWindow => ({
  id, name: id, timeLabel: '', start: 0, end: 0, prayerDone: false, isActive, isLate: false, items
});

/** расписание как из buildTodayPlan: блоки стоят в активном окне Зухр */
const plan = (): PlanWindow[] => [
win('fajr', [{ kind: 'prayer' }, { kind: 'task', task: task('a'), start: 400 }]),
win('dhuhr', [{ kind: 'prayer' }, { kind: 'list', sphere: 'rizq' }, { kind: 'list', sphere: 'other' }, { kind: 'task', task: task('b'), start: 800 }], true),
win('asr', [{ kind: 'prayer' }, { kind: 'free', start: 900, minutes: 60 }]),
win('isha', [{ kind: 'prayer' }, { kind: 'dayEnd' }])];


describe('applyPlacement поверх расписания', () => {
  it('без записи за сегодня — автоматическое положение, расписание не меняется', () => {
    const p = plan();
    expect(flattenPlan(applyPlacement(p, undefined))).toEqual(flattenPlan(p));
    expect(p[1].items).toHaveLength(4); // исходник не тронут
  });

  it('ставит блок после любого элемента: дела, намаза, «Завершения дня» или в начало', () => {
    const order = (spot: {afterId: string | null;}) => flattenPlan(applyPlacement(plan(), { rizq: spot }));
    expect(order({ afterId: 'task:a' })).toEqual([
    'prayer:fajr', 'task:a', 'list:rizq', 'prayer:dhuhr', 'list:other', 'task:b', 'prayer:asr', 'free:asr:900', 'prayer:isha', 'dayEnd']);
    expect(order({ afterId: 'prayer:asr' }).slice(5, 8)).toEqual(['prayer:asr', 'list:rizq', 'free:asr:900']);
    expect(order({ afterId: 'dayEnd' }).at(-1)).toBe('list:rizq');
    expect(order({ afterId: null })[0]).toBe('list:rizq');
  });

  it('опорный элемент исчез (дело выполнено) — блок на автоматическом месте', () => {
    expect(flattenPlan(applyPlacement(plan(), { other: { afterId: 'task:gone' } }))).toEqual(flattenPlan(plan()));
  });

  it('«Удел» со временем в расписании не переносится', () => {
    const p = plan();
    p[1].items[1] = { kind: 'list', sphere: 'rizq', slot: { start: 780, end: 840 } };
    expect(flattenPlan(applyPlacement(p, { rizq: { afterId: null } }))).toEqual(flattenPlan(p));
  });

  it('«Поднять» / «Опустить» — на шаг, «Свободно» не считается опорой', () => {
    const order = flattenPlan(plan());
    expect(shiftPlacement(order, 'rizq', 'up')).toEqual({ afterId: 'task:a' });
    expect(shiftPlacement(order, 'other', 'down')).toEqual({ afterId: 'task:b' });
    const moved = flattenPlan(applyPlacement(plan(), { rizq: { afterId: 'prayer:asr' } }));
    expect(shiftPlacement(moved, 'rizq', 'down')).toEqual({ afterId: 'prayer:isha' });
    const first = flattenPlan(applyPlacement(plan(), { rizq: { afterId: null } }));
    expect(shiftPlacement(first, 'rizq', 'up')).toBeUndefined();
    expect(shiftPlacement(flattenPlan(plan()).slice(0, 2).concat('list:rizq'), 'rizq', 'down')).toBeUndefined();
  });

  it('точка отпускания: между элементами, «Свободно» пропускается', () => {
    const rects = [
    { id: 'prayer:fajr', top: 0, bottom: 40 },
    { id: 'task:a', top: 40, bottom: 90 },
    { id: 'free:asr:900', top: 90, bottom: 120 },
    { id: 'prayer:asr', top: 120, bottom: 160 }];

    expect(placementFromPoint(rects, 10).spot).toEqual({ afterId: null });
    expect(placementFromPoint(rects, 70)).toEqual({ spot: { afterId: 'task:a' }, lineY: 90 });
    expect(placementFromPoint(rects, 110).spot).toEqual({ afterId: 'task:a' });
    expect(placementFromPoint(rects, 500).spot).toEqual({ afterId: 'prayer:asr' });
  });

  it('хранение: старше 7 дней и мусор выбрасываются при нормализации', () => {
    expect(
      prunePlacement(
        {
          '2026-11-03': { rizq: { afterId: 'task:a' }, other: { afterId: null } },
          '2026-10-28': { rizq: { afterId: 'x' } },
          '2026-10-20': { rizq: { afterId: 'old' } },
          broken: 5,
          '2026-11-02': { rizq: { afterId: 7 } }
        },
        '2026-11-03'
      )
    ).toEqual({
      '2026-11-03': { rizq: { afterId: 'task:a' }, other: { afterId: null } },
      '2026-10-28': { rizq: { afterId: 'x' } }
    });
    expect(prunePlacement(null, '2026-11-03')).toEqual({});
  });
});

describe('«Удел» и «Прочее» на «Сегодня»', () => {
  /** порядок элементов расписания на экране: как их видит перенос блока */
  const blockOrder = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-plan-id], [data-row-id]')).
  filter((el) => !el.dataset.rowId || !el.closest('[data-plan-id^="list:"]')).
  map((el) => el.dataset.planId ?? `task:${el.dataset.rowId}`);

  it('меню «⋯»: «Опустить» ставит блок ниже и сохраняет положение только за сегодня; «Вернуть на место»', async () => {
    const user = userEvent.setup();
    renderApp('/today', { tasks: [makeTask('Купить хлеб'), makeTask('Встреча', { date: TEST_TODAY, time: '11:00' })] });
    const auto = blockOrder();
    expect(auto).toContain('list:other');

    await user.click(screen.getByRole('button', { name: 'Переместить «Прочее»' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Опустить' }));
    const spot = appState.blockPlacement[TEST_TODAY]?.other;
    expect(spot).toBeTruthy();
    const moved = blockOrder();
    expect(moved.indexOf('list:other')).toBeGreaterThan(auto.indexOf('list:other'));

    await user.click(screen.getByRole('button', { name: 'Переместить «Прочее»' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Вернуть на место' }));
    expect(appState.blockPlacement[TEST_TODAY]).toBeUndefined();
    expect(blockOrder()).toEqual(auto);
  });

  it('на следующий день блок снова встаёт автоматически', () => {
    const tasks = [makeTask('Купить хлеб')];
    const { unmount } = renderApp('/today', { tasks });
    const auto = blockOrder();
    unmount();
    // вчера «Прочее» перенесли в самое начало — сегодня это не действует
    renderApp('/today', { tasks, blockPlacement: { '2026-11-02': { other: { afterId: null } } } });
    expect(blockOrder()[0]).not.toBe('list:other');
    expect(blockOrder()).toEqual(auto);
  });

  it('положение за сегодня из данных применяется, блок остаётся раскрывающимся', async () => {
    const user = userEvent.setup();
    renderApp('/today', {
      tasks: [makeTask('Купить хлеб')],
      blockPlacement: { [TEST_TODAY]: { other: { afterId: null } } }
    });
    expect(blockOrder()[0]).toBe('list:other');
    const block = document.querySelector('[data-plan-id="list:other"]') as HTMLElement;
    expect(within(block).getByLabelText('Купить хлеб')).toBeTruthy();
    await user.click(within(block).getByRole('button', { name: 'Свернуть «Прочее»' }));
    expect(within(block).queryByLabelText('Купить хлеб')).toBeNull();
  });
});
