import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appState, makeTask, renderApp } from './renderApp';
import { TEST_TODAY } from './setup';
import type { CustomSphere } from '../types';

const study: CustomSphere = { id: 'c_study', name: 'Учёба', icon: 'graduation', color: 'teal', order: 0, createdAt: '' };

describe('страница пользовательской сферы', () => {
  it('работает как у встроенных: заголовок, разделы, «Добавить дело», «Дело в «Раздел»», префикс', async () => {
    const user = userEvent.setup();
    renderApp('/sphere/c_study', {
      customSpheres: [study],
      tasks: [makeTask('Лекция', { sphere: 'c_study', date: '2026-11-03', time: '09:30' })]
    });
    const title = screen.getByRole('heading', { level: 1, name: 'Учёба' });
    expect(title.className).toContain('font-semibold');
    expect(title.className).toContain('text-ink');
    // префикс «день недели и время»
    expect(screen.getByRole('button', { name: /Вт 09:30.*Лекция/ })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Новый раздел' }));
    await user.type(screen.getByRole('textbox', { name: 'Название раздела' }), 'Курсы{Enter}');
    expect(appState.sections).toEqual([expect.objectContaining({ sphere: 'c_study', title: 'Курсы' })]);

    await user.type(screen.getByPlaceholderText('Дело в «Курсы»'), 'Домашка{Enter}');
    const created = appState.tasks.find((t) => t.title === 'Домашка')!;
    expect(created.sphere).toBe('c_study');
    expect(created.sectionId).toBe(appState.sections[0].id);

    await user.type(screen.getByPlaceholderText('Добавить дело'), 'Купить тетради{Enter}');
    expect(appState.tasks.find((t) => t.title === 'Купить тетради')!.sphere).toBe('c_study');
  });

  it('на «Сегодня» дела сферы — обычные строки расписания с подписью сферы, без своего блока', () => {
    renderApp('/today', {
      customSpheres: [study],
      tasks: [makeTask('Семинар', { sphere: 'c_study', date: TEST_TODAY, time: '14:00' })]
    });
    const row = screen.getByLabelText('Семинар');
    expect(row.textContent).toContain('Учёба');
    expect(row.closest('[data-plan-id^="list:"]')).toBeNull();
    expect(document.querySelector('[data-plan-id="list:c_study"]')).toBeNull();
    expect(within(row).getByText('Учёба')).toBeTruthy();
  });
});
