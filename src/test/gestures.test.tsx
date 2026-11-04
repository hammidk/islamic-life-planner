import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appState, makeTask, renderApp } from './renderApp';
import { lockAxis, resolveOpenSwipe, resolveSwipe, rubber } from '../utils/gestures';

describe('классификация жеста строки', () => {
  it('ось включается только после 10 px', () => {
    expect(lockAxis(6, 2)).toBeNull();
    expect(lockAxis(9, 9)).toBeNull();
    expect(lockAxis(12, 0)).toBe('x');
  });

  it('горизонталь — только при |dx| > |dy| × 1.5, иначе страница скроллится', () => {
    expect(lockAxis(15, 9)).toBe('x');
    expect(lockAxis(15, 10)).toBe('y'); // ровно 1.5 — уже не горизонталь
    expect(lockAxis(12, 12)).toBe('y'); // диагональ
    expect(lockAxis(3, 30)).toBe('y');
  });

  it('диагональный и вертикальный жест ничего не делают', () => {
    expect(resolveSwipe(-120, 100, -2)).toBe('none');
    expect(resolveSwipe(90, 70, 1)).toBe('none');
    expect(resolveSwipe(0, 200, 0)).toBe('none');
  });

  it('свайп вправо: порог 64 px или быстрый флик', () => {
    expect(resolveSwipe(40, 0, 0.2)).toBe('none');
    expect(resolveSwipe(64, 0, 0)).toBe('indent');
    expect(resolveSwipe(30, 2, 0.8)).toBe('indent');
  });

  it('свайп влево: кнопки, полный свайп (больше 55% ширины) — удаление', () => {
    expect(resolveSwipe(-40, 0, -0.1, 375)).toBe('none');
    expect(resolveSwipe(-70, 0, 0, 375)).toBe('reveal');
    expect(resolveSwipe(-30, 0, -0.9, 375)).toBe('reveal');
    expect(resolveSwipe(-200, 0, 0, 375)).toBe('reveal');
    expect(resolveSwipe(-210, 0, 0, 375)).toBe('delete');
  });

  it('открытая строка: вправо закрывается, полный свайп удаляет', () => {
    expect(resolveOpenSwipe(40, 0, 0)).toBe('close');
    expect(resolveOpenSwipe(-50, 0, 0)).toBe('stay');
    expect(resolveOpenSwipe(-250, 0, 0)).toBe('delete');
    expect(resolveOpenSwipe(20, 40, 0)).toBe('stay');
  });

  it('сопротивление за пределом', () => {
    expect(rubber(50, 96)).toBe(50);
    expect(rubber(196, 96)).toBe(121);
  });
});

describe('удаление дела и «Отменить»', () => {
  it('«Удалить» из свайпа убирает дело с подзадачами, тост возвращает всё обратно', async () => {
    const user = userEvent.setup();
    const parent = makeTask('Ремонт', { sphere: 'rizq' });
    const sub = makeTask('Купить краску', { sphere: 'rizq', parentId: parent.id });
    renderApp('/sphere/rizq', { tasks: [parent, sub, makeTask('Другое', { sphere: 'rizq' })] });

    const row = screen.getByLabelText('Ремонт').closest('div.relative')!.parentElement!;
    const del = row.querySelector('button.bg-\\[\\#D93B30\\]') as HTMLButtonElement;
    await user.click(del);

    expect(appState.tasks.map((t) => t.title)).toEqual(['Другое']);
    expect(screen.getByRole('status').textContent).toContain('Удалено дело и подзадач: 1');

    await user.click(screen.getByRole('button', { name: 'Отменить' }));
    expect(appState.tasks.map((t) => t.title).sort()).toEqual(['Другое', 'Купить краску', 'Ремонт']);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByLabelText('Купить краску')).toBeTruthy();
  });

  it('строки не выделяют текст и не показывают системное меню', () => {
    renderApp('/sphere/rizq', { tasks: [makeTask('Дело', { sphere: 'rizq' })] });
    const row = screen.getByLabelText('Дело');
    expect(row.classList.contains('row-gesture')).toBe(true);
  });
});
