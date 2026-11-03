import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderApp } from './renderApp';

const isBoldInk = (el: Element | null) =>
Boolean(el && el.className.includes('font-semibold') && /\btext-ink\b/.test(el.className));

describe('названия сфер выделены (600, ink)', () => {
  it('карточки на Главной', () => {
    renderApp('/');
    ['Вера', 'Удел', 'Здоровье', 'Семья', 'Прочее'].forEach((name) =>
    expect(isBoldInk(screen.getByText(name, { selector: 'span' }))).toBe(true)
    );
  });

  it('«Удел», «Прочее» и разделы на «Сегодня»', () => {
    renderApp('/today', { sections: [{ id: 's1', sphere: 'rizq', title: 'Работа' }] });
    expect(isBoldInk(screen.getByText('Удел', { selector: 'span' }))).toBe(true);
    expect(isBoldInk(screen.getByText('Прочее', { selector: 'span' }))).toBe(true);
    expect(isBoldInk(screen.getByText(/^Работа/, { selector: 'button' }))).toBe(true);
  });

  it('заголовок страницы сферы', () => {
    renderApp('/sphere/health');
    expect(isBoldInk(screen.getByRole('heading', { name: 'Здоровье' }))).toBe(true);
  });
});
