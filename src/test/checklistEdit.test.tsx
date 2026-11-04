import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appState, makeTask, renderApp } from './renderApp';

const item = (id: string, title: string) => ({ id, title, done: false });

describe('правка подпунктов на месте', () => {
  it('на странице дела: тап, правка, Enter — текст изменён, ниже открыт новый пункт', async () => {
    const user = userEvent.setup();
    const task = makeTask('Дело');
    renderApp(`/task/${task.id}`, {
      tasks: [task],
      checklists: { [task.id]: [item('a', 'Купить хлеб'), item('b', 'Позвонить')] }
    });

    await user.click(screen.getByRole('button', { name: 'Купить хлеб' }));
    const edit = screen.getByRole('textbox', { name: 'Пункт' }) as HTMLInputElement;
    expect(document.activeElement).toBe(edit);
    expect(edit.className).toContain('text-[16px]');
    await user.clear(edit);
    await user.type(edit, 'Купить хлеб и молоко{Enter}');

    const next = screen.getByRole('textbox', { name: 'Новый пункт' });
    expect(document.activeElement).toBe(next);
    await user.type(next, 'Вынести мусор{Enter}');
    expect(document.activeElement).toBe(next);

    expect(appState.checklists[task.id].map((i) => i.title)).toEqual([
    'Купить хлеб и молоко',
    'Вынести мусор',
    'Позвонить']
    );
  });

  it('потеря фокуса сохраняет, пустой текст удаляет пункт', async () => {
    const user = userEvent.setup();
    const task = makeTask('Дело');
    renderApp(`/task/${task.id}`, {
      tasks: [task],
      checklists: { [task.id]: [item('a', 'Первый'), item('b', 'Второй')] }
    });

    await user.click(screen.getByRole('button', { name: 'Первый' }));
    const edit = screen.getByRole('textbox', { name: 'Пункт' });
    await user.type(edit, ' пункт');
    await user.click(document.body);
    expect(appState.checklists[task.id][0].title).toBe('Первый пункт');

    await user.click(screen.getByRole('button', { name: 'Второй' }));
    await user.clear(screen.getByRole('textbox', { name: 'Пункт' }));
    await user.click(document.body);
    expect(appState.checklists[task.id].map((i) => i.title)).toEqual(['Первый пункт']);
  });

  it('кружок — отдельная область нажатия, строка не ниже 44px', async () => {
    const user = userEvent.setup();
    const task = makeTask('Дело');
    renderApp(`/task/${task.id}`, { tasks: [task], checklists: { [task.id]: [item('a', 'Пункт А')] } });
    await user.click(screen.getByRole('button', { name: 'Отметить: Пункт А' }));
    expect(appState.checklists[task.id][0].done).toBe(true);
    expect(screen.queryByRole('textbox', { name: 'Пункт' })).toBeNull();
    // строка пункта — не ниже 44px
    const row = screen.getByRole('button', { name: 'Пункт А' }).parentElement!;
    expect(row.className).toContain('min-h-[44px]');
  });


  it('в «Подробно» при создании дела', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await user.click(screen.getByRole('button', { name: 'Создать задачу' }));
    await user.click(screen.getByRole('button', { name: 'Подробно' }));
    const dialog = screen.getByRole('dialog', { name: 'Подробно' });
    await user.type(within(dialog).getByPlaceholderText('Добавить пункт'), 'Черновой{Enter}');
    await user.click(within(dialog).getByRole('button', { name: 'Черновой' }));
    const edit = within(dialog).getByRole('textbox', { name: 'Пункт' });
    await user.type(edit, ' пункт{Enter}');
    expect(within(dialog).getByRole('button', { name: 'Черновой пункт' })).toBeTruthy();
    expect(document.activeElement).toBe(within(dialog).getByRole('textbox', { name: 'Новый пункт' }));
  });
});
