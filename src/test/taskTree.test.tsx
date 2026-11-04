import { describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appState, makeTask, renderApp } from './renderApp';
import { TEST_TODAY } from './setup';
import {
  buildTaskTree,
  canIndent,
  collectSubtree,
  indent,
  moveUnder,
  outdent,
  parentCandidates } from
'../utils/taskTree';
import type { Task } from '../types';

const t = (id: string, patch: Partial<Task> = {}): Task => ({
  id,
  title: id,
  sphere: 'other',
  period: 'untilDhuhr',
  status: 'open',
  order: Number(id.replace(/\D/g, '')) || 0,
  ...patch
});

describe('taskTree: indent / outdent / moveUnder', () => {
  it('indent: дело становится последней подзадачей дела выше, наследует сферу и раздел', () => {
    const tasks = [
    t('a1', { sphere: 'rizq', sectionId: 's1' }),
    t('a2', { parentId: 'a1', sphere: 'rizq', sectionId: 's1', order: 5 }),
    t('b3', { sphere: 'health', date: '2026-11-05', time: '09:00', description: 'заметка', repeat: { kind: 'daily' } })];

    const r = indent(tasks, 'b3', 'a1');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const b = r.tasks.find((x) => x.id === 'b3')!;
    expect(b.parentId).toBe('a1');
    expect(b.sphere).toBe('rizq');
    expect(b.sectionId).toBe('s1');
    // своё остаётся своим
    expect(b.date).toBe('2026-11-05');
    expect(b.time).toBe('09:00');
    expect(b.description).toBe('заметка');
    expect(b.repeat).toEqual({ kind: 'daily' });
    // последней подзадачей
    expect(b.order).toBeGreaterThan(5);
  });

  it('выше ничего нет — «Нет дела выше»', () => {
    expect(indent([t('a1')], 'a1', undefined)).toEqual({ ok: false, reason: 'noAbove' });
  });

  it('лимит двух уровней: подзадачу глубже не вложить', () => {
    const tasks = [t('a1'), t('a2', { parentId: 'a1' }), t('a3')];
    expect(canIndent(tasks, 'a2', 'a1')).toBe('tooDeep');
    // под подзадачу тоже нельзя
    expect(moveUnder(tasks, 'a3', 'a2')).toEqual({ ok: false, reason: 'tooDeep' });
  });

  it('дело со своими подзадачами нельзя сделать подзадачей', () => {
    const tasks = [t('a1'), t('a2'), t('a3', { parentId: 'a2' })];
    expect(indent(tasks, 'a2', 'a1')).toEqual({ ok: false, reason: 'hasChildren' });
  });

  it('защита от цикла: в себя и в свою подзадачу нельзя', () => {
    const tasks = [t('a1'), t('a2', { parentId: 'a1' })];
    expect(moveUnder(tasks, 'a1', 'a1')).toEqual({ ok: false, reason: 'cycle' });
    expect(moveUnder(tasks, 'a1', 'a2')).toEqual({ ok: false, reason: 'cycle' });
    // старые данные с циклом: обход не зависает
    const loop = [t('x1', { parentId: 'x2' }), t('x2', { parentId: 'x1' })];
    expect(collectSubtree(loop, 'x1').map((x) => x.id).sort()).toEqual(['x1', 'x2']);
  });

  it('подзадачу можно перевесить на другое дело через меню', () => {
    const tasks = [t('a1'), t('a2', { parentId: 'a1' }), t('a3')];
    const r = moveUnder(tasks, 'a2', 'a3');
    expect(r.ok && r.tasks.find((x) => x.id === 'a2')!.parentId).toBe('a3');
  });

  it('outdent: подзадача встаёт сразу после бывшего родителя', () => {
    const tasks = [
    t('a1', { order: 1 }),
    t('a2', { order: 2 }),
    t('a3', { parentId: 'a1', order: 9 }),
    t('a4', { order: 3, sphere: 'health' })];

    const next = outdent(tasks, 'a3');
    const a3 = next.find((x) => x.id === 'a3')!;
    expect(a3.parentId).toBeUndefined();
    expect(a3.order).toBeGreaterThan(1);
    expect(a3.order).toBeLessThan(2);
  });

  it('дерево: подзадача под родителем; без родителя в списке — сама, с подписью; ничего не теряется', () => {
    const all = [t('p1', { title: 'Ремонт' }), t('c2', { parentId: 'p1' }), t('c3', { parentId: 'p1' }), t('d4', { parentId: 'c2' })];
    const nested = buildTaskTree(all);
    expect(nested.map((n) => n.task.id)).toEqual(['p1', 'd4']);
    expect(nested[0].children.map((c) => c.id)).toEqual(['c2', 'c3']);
    // третий уровень из старых данных — самостоятельно, с подписью родителя
    expect(nested[1].parentTitle).toBe('c2');

    const alone = buildTaskTree([all[2]], all);
    expect(alone).toEqual([{ task: all[2], children: [], parentTitle: 'Ремонт' }]);

    const loop = [t('x1', { parentId: 'x2' }), t('x2', { parentId: 'x1' })];
    expect(buildTaskTree(loop).map((n) => n.task.id)).toEqual(['x1', 'x2']);
  });

  it('кандидаты в родители: без самого дела, его подзадач и подзадач вообще', () => {
    const tasks = [t('a1'), t('a2', { parentId: 'a1' }), t('b3'), t('b4', { parentId: 'b3' }), t('c5')];
    expect(parentCandidates(tasks, 'a1').map((x) => x.id)).toEqual(['b3', 'c5']);
  });
});

describe('подзадачи на экранах', () => {
  it('«Сегодня»: подзадача под родителем с отступом; без родителя в списке — «↳ Родитель»', () => {
    const parent = makeTask('Ремонт', { sphere: 'other' });
    const sub = makeTask('Купить краску', { sphere: 'other', parentId: parent.id });
    const timedParent = makeTask('Встреча', { date: TEST_TODAY, time: '20:00' });
    const lonely = makeTask('Подготовить слайды', { sphere: 'other', parentId: timedParent.id });
    renderApp('/today', { tasks: [parent, sub, timedParent, lonely] });

    const subRow = screen.getByLabelText('Купить краску');
    // подзадача внутри блока с линией слева
    expect(subRow.closest('.border-l')).not.toBeNull();
    expect(screen.getByLabelText('Ремонт').closest('.border-l')).toBeNull();

    const lonelyRow = screen.getByLabelText('Подготовить слайды');
    expect(lonelyRow.textContent).toContain('↳ Встреча');
  });

  it('«Вынести» у подзадачи делает её обычным делом сразу после родителя', async () => {
    const user = userEvent.setup();
    const parent = makeTask('Ремонт', { sphere: 'rizq', order: 1 });
    const next = makeTask('Следующее', { sphere: 'rizq', order: 2 });
    const sub = makeTask('Купить краску', { sphere: 'rizq', parentId: parent.id, order: 3 });
    renderApp('/sphere/rizq', { tasks: [parent, next, sub] });

    const row = screen.getByLabelText('Купить краску').closest('div.relative')!.parentElement!;
    await user.click(within(row).getByRole('button', { name: 'Вынести', hidden: true }));
    const moved = appState.tasks.find((x) => x.id === sub.id)!;
    expect(moved.parentId).toBeUndefined();
    expect(moved.order).toBeGreaterThan(1);
    expect(moved.order).toBeLessThan(2);
    expect(screen.getByLabelText('Купить краску').closest('.border-l')).toBeNull();
  });

  it('меню подзадачи: «Сделать обычным делом»', async () => {
    const user = userEvent.setup();
    const parent = makeTask('Ремонт', { date: '2026-11-04' });
    const sub = makeTask('Купить краску', { parentId: parent.id, date: '2026-11-04' });
    renderApp('/day/2026-11-04', { tasks: [parent, sub] });
    // правая кнопка мыши — то же меню, что долгое нажатие
    fireEvent.contextMenu(screen.getByLabelText('Купить краску'));
    await user.click(await screen.findByRole('button', { name: 'Сделать обычным делом' }));
    expect(appState.tasks.find((x) => x.id === sub.id)!.parentId).toBeUndefined();
  });
});
