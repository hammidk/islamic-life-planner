import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeTask, renderApp } from './renderApp';

const SUGGESTIONS = ['Подготовиться', 'Проверить результат', 'Сделать дуа перед началом'];

describe('подсказки подпунктов у дел убраны', () => {
  it('на странице дела только поле добавления', async () => {
    const user = userEvent.setup();
    const task = makeTask('Дело');
    renderApp(`/task/${task.id}`, { tasks: [task] });
    await user.click(screen.getByRole('button', { name: /добавить пункт/i }));
    expect(screen.getByPlaceholderText('Свой пункт')).toBeTruthy();
    SUGGESTIONS.forEach((s) => expect(screen.queryByText(new RegExp(s))).toBeNull());
  });

  it('в «Подробно» при создании', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await user.click(screen.getByRole('button', { name: 'Создать задачу' }));
    await user.click(screen.getByRole('button', { name: 'Подробно' }));
    expect(screen.getByPlaceholderText('Добавить пункт')).toBeTruthy();
    SUGGESTIONS.forEach((s) => expect(screen.queryByText(new RegExp(s))).toBeNull());
  });
});
