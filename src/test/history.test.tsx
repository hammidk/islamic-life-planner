import { describe, expect, it } from 'vitest';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appState, makeTask, renderApp } from './renderApp';
import { TEST_TODAY } from './setup';

const historyButton = () => screen.queryByRole('button', { name: /История/ });

describe('«История · N» на «Сегодня»', () => {
  it('отмеченное дело уходит в Историю, снятие отметки возвращает его на место', async () => {
    const user = userEvent.setup();
    const first = makeTask('Первое', { sphere: 'other' });
    const target = makeTask('Отчёт', { sphere: 'other' });
    const last = makeTask('Последнее', { sphere: 'other' });
    renderApp('/today', { tasks: [first, target, last] });

    // нечего показывать — блока нет
    expect(historyButton()).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Выполнить: Отчёт' }));
    // короткая пауза, чтобы отметка была видна перед исчезновением
    await act(() => new Promise((r) => setTimeout(r, 600)));

    const done = appState.tasks.find((t) => t.id === target.id);
    expect(done?.status).toBe('done');
    expect(done?.completedOn).toBe(TEST_TODAY);
    expect(screen.queryByRole('button', { name: 'Выполнить: Отчёт' })).toBeNull();

    // свёрнут по умолчанию
    const toggle = historyButton()!;
    expect(toggle.textContent).toMatch(/История · 1/);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await user.click(toggle);
    const section = toggle.closest('section')!;
    await user.click(within(section).getByRole('button', { name: 'Отменить выполнение: Отчёт' }));

    const back = appState.tasks.find((t) => t.id === target.id);
    expect(back?.status).toBe('open');
    expect(back?.completedOn).toBeUndefined();
    expect(back?.order).toBe(target.order);
    expect(historyButton()).toBeNull();

    // снова в списке и на прежнем месте: между «Первое» и «Последнее»
    const order = screen.getAllByRole('button', { name: /^Выполнить: / }).map((b) => b.getAttribute('aria-label'));
    expect(order.indexOf('Выполнить: Отчёт')).toBe(order.indexOf('Выполнить: Первое') + 1);
    expect(order.indexOf('Выполнить: Последнее')).toBe(order.indexOf('Выполнить: Отчёт') + 1);
  });

  it('старые выполненные дела без completedOn с датой сегодня тоже в Истории', () => {
    renderApp('/today', { tasks: [makeTask('Старое', { date: TEST_TODAY, status: 'done' })] });
    expect(historyButton()?.textContent).toMatch(/История · 1/);
  });
});
