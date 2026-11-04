import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appState, makeTask, renderApp } from './renderApp';
import { TEST_TODAY } from './setup';

const titles = () => appState.tasks.map((t) => t.title);

/** Три Enter подряд: три дела, поле пустое и в фокусе (тот же элемент) */
async function typeThree(input: HTMLElement, user: ReturnType<typeof userEvent.setup>) {
  for (const name of ['Первое', 'Второе', 'Третье']) {
    await user.type(input, `${name}{Enter}`);
    expect(document.activeElement).toBe(input);
    expect((input as HTMLInputElement).value).toBe('');
  }
}

async function openInline(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Создать задачу' }));
  return screen.getByPlaceholderText('Новое дело');
}

describe('Enter создаёт следующее дело', () => {
  it('карточка вверху страницы сферы: три дела, контекст сферы', async () => {
    const user = userEvent.setup();
    renderApp('/sphere/health');
    const input = await openInline(user);
    expect(document.activeElement).toBe(input);
    await typeThree(input, user);
    const created = appState.tasks.filter((t) => ['Первое', 'Второе', 'Третье'].includes(t.title));
    expect(created).toHaveLength(3);
    expect(created.every((t) => t.sphere === 'health')).toBe(true);
  });

  it('карточка вверху «Сегодня»', async () => {
    const user = userEvent.setup();
    renderApp('/today');
    const input = await openInline(user);
    await typeThree(input, user);
    expect(titles()).toEqual(expect.arrayContaining(['Первое', 'Второе', 'Третье']));
  });

  it('карточка вверху экрана дня: новые дела на этот день', async () => {
    const user = userEvent.setup();
    renderApp('/day/2026-11-10');
    const input = await openInline(user);
    await typeThree(input, user);
    expect(appState.tasks.filter((t) => t.date === '2026-11-10')).toHaveLength(3);
  });

  it('карточка вверху раздела: сфера и раздел наследуются', async () => {
    const user = userEvent.setup();
    renderApp('/sphere/rizq/section/s1', { sections: [{ id: 's1', sphere: 'rizq', title: 'Работа' }] });
    const input = await openInline(user);
    await typeThree(input, user);
    const created = appState.tasks;
    expect(created).toHaveLength(3);
    expect(created.every((t) => t.sphere === 'rizq' && t.sectionId === 's1')).toBe(true);
  });

  it('следующая карточка наследует дату, а время сбрасывает', async () => {
    const user = userEvent.setup();
    renderApp('/today');
    // «Свободно» открывает карточку с датой и временем
    const free = screen.getAllByRole('button', { name: /^Создать дело на/ })[0];
    await user.click(free);
    const input = screen.getByPlaceholderText('Новое дело');
    await user.type(input, 'С временем{Enter}');
    await user.type(input, 'Без времени{Enter}');
    const first = appState.tasks.find((t) => t.title === 'С временем');
    const second = appState.tasks.find((t) => t.title === 'Без времени');
    expect(first?.date).toBe(TEST_TODAY);
    expect(first?.time).toBeTruthy();
    expect(second?.date).toBe(TEST_TODAY);
    expect(second?.time).toBeUndefined();
  });

  it('пустое название и Enter: ничего не создаётся, фокус остаётся', async () => {
    const user = userEvent.setup();
    renderApp('/sphere/health');
    const input = await openInline(user);
    await user.type(input, '{Enter}');
    expect(appState.tasks).toHaveLength(0);
    expect(document.activeElement).toBe(input);
  });

  it('окно создания снизу на Главной', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await user.click(screen.getByRole('button', { name: 'Создать задачу' }));
    const dialog = screen.getByRole('dialog', { name: 'Новое дело' });
    const input = within(dialog).getByPlaceholderText('Новое дело');
    await typeThree(input, user);
    expect(titles()).toEqual(['Первое', 'Второе', 'Третье']);
  });

  it('строка «Добавить дело» в списке сферы', async () => {
    const user = userEvent.setup();
    renderApp('/sphere/health');
    const input = screen.getByPlaceholderText('Добавить дело');
    await typeThree(input, user);
    expect(appState.tasks.filter((t) => t.sphere === 'health')).toHaveLength(3);
  });

  it('строка «Дело в «Раздел»» в списке сферы', async () => {
    const user = userEvent.setup();
    renderApp('/sphere/rizq', { sections: [{ id: 's1', sphere: 'rizq', title: 'Работа' }] });
    const input = screen.getByPlaceholderText('Дело в «Работа»');
    await typeThree(input, user);
    expect(appState.tasks.filter((t) => t.sectionId === 's1')).toHaveLength(3);
  });

  it('поле добавления подпункта на странице дела', async () => {
    const user = userEvent.setup();
    const task = makeTask('Дело с пунктами');
    renderApp(`/task/${task.id}`, { tasks: [task] });
    await user.click(screen.getByRole('button', { name: /добавить пункт/i }));
    const input = screen.getByPlaceholderText('Свой пункт');
    await typeThree(input, user);
    expect((appState.checklists[task.id] ?? []).map((i) => i.title)).toEqual(['Первое', 'Второе', 'Третье']);
  });

  it('поле подпункта в «Подробно» при создании', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await user.click(screen.getByRole('button', { name: 'Создать задачу' }));
    await user.click(screen.getByRole('button', { name: 'Подробно' }));
    const input = screen.getByPlaceholderText('Добавить пункт');
    for (const name of ['Первое', 'Второе', 'Третье']) {
      await user.type(input, `${name}{Enter}`);
      expect(document.activeElement).toBe(input);
      expect((input as HTMLInputElement).value).toBe('');
    }
    expect(screen.getByText('Третье')).toBeTruthy();
  });
});
