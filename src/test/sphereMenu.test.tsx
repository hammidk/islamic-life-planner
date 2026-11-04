import { describe, expect, it } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appState, makeTask, renderApp } from './renderApp';
import type { CustomSphere } from '../types';

const study: CustomSphere = { id: 'c_study', name: 'Учёба', icon: 'graduation', color: 'teal', order: 0, createdAt: '' };

describe('изменить и удалить свою сферу', () => {
  it('«Изменить» открывает то же окно, название меняется', async () => {
    const user = userEvent.setup();
    renderApp('/sphere/c_study', { customSpheres: [study] });
    await user.click(screen.getByRole('button', { name: 'Меню сферы «Учёба»' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Изменить' }));
    const dialog = await screen.findByRole('dialog', { name: 'Изменить сферу' });
    const input = within(dialog).getByRole('textbox', { name: 'Название сферы' }) as HTMLInputElement;
    expect(input.value).toBe('Учёба');
    await user.clear(input);
    await user.type(input, 'Знания{Enter}');
    expect(appState.customSpheres[0]).toMatchObject({ id: 'c_study', name: 'Знания' });
    expect(screen.getByRole('heading', { level: 1, name: 'Знания' })).toBeTruthy();
  });

  it('«Удалить» с подтверждением: дела и разделы переходят в «Прочее»', async () => {
    const user = userEvent.setup();
    renderApp('/sphere/c_study', {
      customSpheres: [study],
      sections: [{ id: 's1', sphere: 'c_study', title: 'Курсы' }],
      tasks: [makeTask('Домашка', { sphere: 'c_study', sectionId: 's1' }), makeTask('Тетради', { sphere: 'c_study' })]
    });
    await user.click(screen.getByRole('button', { name: 'Меню сферы «Учёба»' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Удалить' }));
    const dialog = await screen.findByRole('dialog', { name: 'Удалить сферу «Учёба»? 2 дела и 1 раздел перейдут в «Прочее»' });
    await user.click(within(dialog).getByRole('button', { name: 'Удалить' }));

    expect(appState.customSpheres).toEqual([]);
    expect(appState.tasks.map((t) => [t.title, t.sphere, t.sectionId])).toEqual([
    ['Домашка', 'other', 's1'],
    ['Тетради', 'other', undefined]]
    );
    expect(appState.sections).toEqual([{ id: 's1', sphere: 'other', title: 'Курсы' }]);
    // ушли на Главную
    await waitFor(() => expect(screen.getByRole('button', { name: 'Прочее, дел: 2' })).toBeTruthy());
  });

  it('отмена подтверждения ничего не меняет', async () => {
    const user = userEvent.setup();
    renderApp('/sphere/c_study', { customSpheres: [study], tasks: [makeTask('Домашка', { sphere: 'c_study' })] });
    await user.click(screen.getByRole('button', { name: 'Меню сферы «Учёба»' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Удалить' }));
    const dialog = await screen.findByRole('dialog', { name: /Удалить сферу «Учёба»\? 1 дело и 0 разделов/ });
    await user.click(within(dialog).getByRole('button', { name: 'Отмена' }));
    expect(appState.customSpheres).toHaveLength(1);
    expect(appState.tasks[0].sphere).toBe('c_study');
  });

  it('у встроенных сфер меню нет', () => {
    renderApp('/sphere/rizq', { customSpheres: [study] });
    expect(screen.queryByRole('button', { name: /Меню сферы/ })).toBeNull();
  });

  it('разделы удалённой сферы видны в «Прочее»', () => {
    renderApp('/sphere/other', {
      sections: [{ id: 's1', sphere: 'other', title: 'Курсы' }],
      tasks: [makeTask('Домашка', { sphere: 'other', sectionId: 's1' })]
    });
    expect(screen.getByRole('button', { name: /Курсы/ })).toBeTruthy();
    expect(screen.getByLabelText('Домашка')).toBeTruthy();
  });

  it('на Главной долгое нажатие на своей карточке открывает то же меню, на встроенной — нет', async () => {
    renderApp('/', { customSpheres: [study] });
    const card = screen.getByRole('button', { name: 'Учёба, дел: 0' });
    fireEvent.pointerDown(card, { button: 0, clientX: 10, clientY: 10 });
    await act(() => new Promise((r) => setTimeout(r, 400)));
    fireEvent.pointerUp(card);
    expect(screen.getByRole('menuitemradio', { name: 'Изменить' })).toBeTruthy();
    expect(screen.getByRole('menuitemradio', { name: 'Удалить' })).toBeTruthy();

    fireEvent.contextMenu(screen.getByRole('button', { name: 'Удел, дел: 0' }));
    expect(screen.getAllByRole('menu')).toHaveLength(1);
  });
});
