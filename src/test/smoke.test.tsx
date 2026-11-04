import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderApp, makeTask } from './renderApp';

describe('тестовое окружение', () => {
  it('рисует страницу сферы с делом', () => {
    renderApp('/sphere/health', { tasks: [makeTask('Пробежка', { sphere: 'health' })] });
    expect(screen.getByText('Пробежка')).toBeTruthy();
  });
});
