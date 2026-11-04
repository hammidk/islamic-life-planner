import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderApp } from './renderApp';

const prayerLine = (name: string) =>
screen.getAllByText((_, el) => el?.tagName === 'P' && Boolean(el.textContent?.includes(name)) && el.textContent!.length < 60).
find((el) => el.querySelector('.font-semibold'))?.textContent;

describe('блок намаза на «Сегодня»', () => {
  it('сначала время, потом название; подсказка после названия', () => {
    renderApp('/today');
    expect(prayerLine('Фаджр')).toBe('06:18 Фаджр · восход 07:50');
    expect(prayerLine('Зухр')).toBe('12:40 Зухр');
    expect(prayerLine('Тахаджуд')).toBe('03:24 — 06:18 Тахаджуд');
  });
});
