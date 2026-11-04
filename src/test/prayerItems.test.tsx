import { describe, expect, it } from 'vitest';
import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appState, makeTask, renderApp } from './renderApp';
import type { ChecklistItem } from '../types';

const it_ = (id: string, title = id, patch: Partial<ChecklistItem> = {}): ChecklistItem => ({ id, title, done: false, ...patch });

describe('пункты намаза на «Сегодня»', () => {
  it('отметка пункта не меняет намаз; счётчик считает и подпункты; Тахаджуд так же', async () => {
    const user = userEvent.setup();
    renderApp('/today', {
      tasks: [makeTask('Дело')],
      checklists: {
        fajr: [it_('p1', 'Коран', { done: true }), it_('p2', 'Аят', { parentId: 'p1' }), it_('p3', 'Дуа')],
        tahajjud: [it_('t1', 'Витр'), it_('t2', 'Две ракаата', { parentId: 't1', note: 'медленно' })]
      }
    });
    expect(screen.getByRole('button', { name: 'Показать пункты: Фаджр' }).textContent).toContain('1/3');
    await user.click(screen.getByRole('button', { name: 'Показать пункты: Фаджр' }));
    await user.click(screen.getByRole('button', { name: 'Отметить: Аят' }));
    expect(appState.checklists.fajr[1].done).toBe(true);
    expect(screen.getByRole('button', { name: 'Отметить намаз: Фаджр' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('button', { name: 'Скрыть пункты: Фаджр' }).textContent).toContain('2/3');

    await user.click(screen.getByRole('button', { name: 'Показать пункты: Тахаджуд' }));
    expect(screen.getByLabelText('Две ракаата').closest('.border-l')).not.toBeNull();
    expect(screen.getByText('медленно').closest('button')!.textContent).toBe('Две ракаатамедленно');
    await act(async () => {});
  });
});

describe('один и тот же редактор во всех карточках намазов', () => {
  it.each(['Фаджр', 'Зухр', 'Аср', 'Магриб', 'Иша', 'Тахаджуд'])('%s: подсказки, подпункт из меню, описание', async (name) => {
    const user = userEvent.setup();
    renderApp('/today', { tasks: [makeTask('Дело')] });
    await user.click(screen.getByRole('button', { name: `Показать пункты: ${name}` }));
    await user.click(screen.getByRole('button', { name: 'добавить пункт' }));
    // подсказки намазов остались
    await user.click(screen.getByRole('button', { name: '+ Азкары' }));
    await user.type(screen.getByPlaceholderText('Свой пункт'), 'Утренние{Enter}');
    fireEvent.contextMenu(screen.getByLabelText('Утренние'));
    const dialog = await screen.findByRole('dialog', { name: 'Утренние' });
    expect(within(dialog).getByRole('button', { name: 'Описание' })).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: 'Сделать подпунктом' }));
    const id = ({ Фаджр: 'fajr', Зухр: 'dhuhr', Аср: 'asr', Магриб: 'maghrib', Иша: 'isha', Тахаджуд: 'tahajjud' } as Record<string, string>)[name];
    const list = appState.checklists[id];
    expect(list.map((i) => i.title)).toEqual(['Азкары', 'Утренние']);
    expect(list[1].parentId).toBe(list[0].id);
  });
});
