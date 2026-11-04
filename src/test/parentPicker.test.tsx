import { describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appState, makeTask, renderApp } from './renderApp';

describe('«Сделать подзадачей…» из меню', () => {
  it('выбор с поиском и группами по сферам; без самого дела, его подзадач и подзадач', async () => {
    const user = userEvent.setup();
    const task = makeTask('Написать письмо', { sphere: 'other', date: '2026-11-04', time: '09:00' });
    const ownSub = makeTask('Найти адрес', { sphere: 'other', parentId: task.id });
    const rizq = makeTask('Проект сайта', { sphere: 'rizq', sectionId: 's-web' });
    const rizqSub = makeTask('Макет', { sphere: 'rizq', parentId: rizq.id });
    const health = makeTask('Зал', { sphere: 'health' });
    // родитель с подзадачей сам вложиться не может — берём дело без подзадач
    const lone = makeTask('Позвонить', { sphere: 'other', date: '2026-11-04' });
    renderApp('/day/2026-11-04', { tasks: [task, ownSub, rizq, rizqSub, health, lone] });

    fireEvent.contextMenu(screen.getByLabelText('Позвонить'));
    await user.click(await screen.findByRole('button', { name: /Сделать подзадачей/ }));

    const dialog = screen.getByRole('dialog');
    const groups = within(dialog).getAllByRole('region').map((g) => g.getAttribute('aria-label'));
    expect(groups).toEqual(['Удел', 'Здоровье', 'Прочее']); // порядок сфер приложения
    const options = within(dialog).
    getAllByRole('button').
    map((b) => b.textContent?.trim()).
    filter(Boolean);
    expect(options).toContain('Проект сайта');
    expect(options).toContain('Написать письмо');
    // нет самого дела и подзадач
    expect(options).not.toContain('Позвонить');
    expect(options).not.toContain('Макет');
    expect(options).not.toContain('Найти адрес');

    await user.type(within(dialog).getByRole('textbox', { name: 'Найти дело' }), 'сайт');
    expect(within(dialog).queryByRole('button', { name: 'Зал' })).toBeNull();
    await user.click(within(dialog).getByRole('button', { name: 'Проект сайта' }));

    const moved = appState.tasks.find((t) => t.id === lone.id)!;
    expect(moved.parentId).toBe(rizq.id);
    expect(moved.sphere).toBe('rizq');
    expect(moved.sectionId).toBe('s-web');
    expect(moved.date).toBe('2026-11-04');
  });

  it('у дела с подзадачами — объяснение вместо списка', async () => {
    const user = userEvent.setup();
    const parent = makeTask('Ремонт', { date: '2026-11-04' });
    renderApp('/day/2026-11-04', { tasks: [parent, makeTask('Краска', { parentId: parent.id, date: '2026-11-04' })] });
    fireEvent.contextMenu(screen.getByLabelText('Ремонт'));
    await user.click(await screen.findByRole('button', { name: /Сделать подзадачей/ }));
    expect(screen.getByRole('dialog').textContent).toContain('У дела есть подзадачи');
  });
});
