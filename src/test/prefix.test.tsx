import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { makeTask, renderApp } from './renderApp';
import { TEST_TODAY } from './setup';

/** Текст строки названия: [префикс] [иконка] [название] */
const titleLine = (title: string) => {
  const line = screen.getAllByText((_, el) => el?.tagName === 'P' && Boolean(el.textContent?.endsWith(title)))[0];
  return line.textContent ?? '';
};

// 2026-11-03 — вторник, 2026-11-07 — суббота
describe('день недели и время перед названием', () => {
  const tasks = [
  makeTask('С датой и временем', { sphere: 'rizq', date: '2026-11-03', time: '10:00' }),
  makeTask('Только с датой', { sphere: 'rizq', date: '2026-11-07' }),
  makeTask('Без даты', { sphere: 'rizq' }),
  makeTask('Подзадача с датой', { sphere: 'rizq', date: '2026-11-03', time: '09:30', parentId: 't-1' })];


  it('в списке сферы: «Вт 10:00», «Сб», без даты — нет', () => {
    renderApp('/sphere/rizq', { tasks: tasks.map((t, i) => i === 3 ? { ...t, parentId: tasks[0].id } : t) });
    expect(titleLine('С датой и временем')).toBe('Вт 10:00 С датой и временем');
    expect(titleLine('Только с датой')).toBe('Сб Только с датой');
    expect(titleLine('Без даты')).toBe('Без даты');
    expect(titleLine('Подзадача с датой')).toBe('Вт 09:30 Подзадача с датой');
  });

  it('на странице раздела', () => {
    const inSection = [makeTask('Дело раздела', { sphere: 'rizq', sectionId: 's1', date: TEST_TODAY, time: '11:15' })];
    renderApp('/sphere/rizq/section/s1', { tasks: inSection, sections: [{ id: 's1', sphere: 'rizq', title: 'Работа' }] });
    expect(titleLine('Дело раздела')).toBe('Вт 11:15 Дело раздела');
  });

  it('на экране дня из календаря префикса нет', () => {
    renderApp(`/day/${TEST_TODAY}`, { tasks: [makeTask('Дело дня', { date: TEST_TODAY, time: '10:00' })] });
    expect(titleLine('Дело дня')).toBe('Дело дня');
  });
});
