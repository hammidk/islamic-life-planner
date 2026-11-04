import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appState, makeTask, renderApp } from './renderApp';
import type { CustomSphere } from '../types';

const custom = (n: number): CustomSphere[] =>
Array.from({ length: n }, (_, i) => ({ id: `c_s${i}`, name: `Сфера ${i}`, icon: 'book', color: 'teal', order: i, createdAt: '' }));

describe('окно «Новая сфера»', () => {
  it('название и Enter создают сферу — она сразу на Главной со счётчиком 0', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await user.click(screen.getByRole('button', { name: 'Добавить сферу' }));
    const dialog = screen.getByRole('dialog', { name: 'Новая сфера' });
    const input = within(dialog).getByRole('textbox', { name: 'Название сферы' });
    expect(input.className).toContain('text-[16px]');
    // 24 иконки и 8 цветов
    expect(within(dialog).getAllByRole('button', { name: /^Иконка / })).toHaveLength(24);
    expect(within(dialog).getAllByRole('button', { name: /^Цвет / })).toHaveLength(8);
    await user.click(within(dialog).getByRole('button', { name: 'Иконка code' }));
    await user.click(within(dialog).getByRole('button', { name: 'Цвет plum' }));
    await user.type(input, '  Учёба  {Enter}');

    expect(appState.customSpheres).toHaveLength(1);
    expect(appState.customSpheres[0]).toMatchObject({ name: 'Учёба', icon: 'code', color: 'plum' });
    // окно закрылось (после анимации)
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Новая сфера' })).toBeNull());
    expect(screen.getByRole('button', { name: 'Учёба, дел: 0' })).toBeTruthy();
  });

  it('пустое название и повтор не создают сферу', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await user.click(screen.getByRole('button', { name: 'Добавить сферу' }));
    const dialog = screen.getByRole('dialog', { name: 'Новая сфера' });
    const input = within(dialog).getByRole('textbox', { name: 'Название сферы' });
    await user.type(input, '   {Enter}');
    expect(appState.customSpheres).toHaveLength(0);
    expect(within(dialog).getByRole('alert').textContent).toBe('Введите название');
    expect((within(dialog).getByRole('button', { name: 'Создать' }) as HTMLButtonElement).disabled).toBe(true);

    await user.type(input, 'семья{Enter}');
    expect(appState.customSpheres).toHaveLength(0);
    expect(within(dialog).getByRole('alert').textContent).toBe('Такая сфера уже есть');
  });

  it('после 12 сфер карточки «+» нет', () => {
    renderApp('/', { customSpheres: custom(12) });
    expect(screen.queryByRole('button', { name: 'Добавить сферу' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Сфера 11, дел: 0' })).toBeTruthy();
  });

  it('новая сфера — в выборе сферы, в переносе дела и в группах «Сделать подзадачей…»', async () => {
    const user = userEvent.setup();
    renderApp('/day/2026-11-04', { tasks: [makeTask('Дело', { date: '2026-11-04' })], customSpheres: custom(1) });
    fireEvent.contextMenu(screen.getByLabelText('Дело'));
    await user.click(await screen.findByRole('button', { name: /Переместить в список/ }));
    await user.click(screen.getByRole('button', { name: 'Сфера 0' }));
    expect(appState.tasks[0].sphere).toBe('c_s0');
    // мета-строка дела подписана новой сферой
    expect(screen.getByLabelText('Дело').textContent).toContain('Сфера 0');
  });
});
