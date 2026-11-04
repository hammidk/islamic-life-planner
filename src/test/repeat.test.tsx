import { describe, expect, it } from 'vitest';
import { useEffect } from 'react';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appState, makeTask, renderApp } from './renderApp';
import { setTestDay } from './setup';
import { useApp } from '../contexts/AppContext';
import { normalize } from '../utils/userData';
import { render } from '@testing-library/react';
import { AppProvider } from '../contexts/AppContext';
import { emptySnapshot } from '../utils/userData';
import type { Task } from '../types';

// 2026-11-02 — понедельник, 03 — вторник, 04 — среда, 06 — пятница, 08 — воскресенье
const MON = '2026-11-02';
const TUE = '2026-11-03';
const WED = '2026-11-04';

const training = (patch: Partial<Task> = {}) =>
makeTask('Тренировка', { sphere: 'health', time: '18:00', date: '2026-10-26', repeat: { kind: 'weekdays', days: [0, 2, 4] }, ...patch });

const onToday = () => screen.queryByLabelText('Тренировка');

describe('повтор Пн/Ср/Пт, 18:00 на «Сегодня»', () => {
  it('в понедельник дело видно (дата начала — прошлый понедельник)', () => {
    setTestDay(MON);
    renderApp('/today', { tasks: [training()] });
    expect(onToday()).not.toBeNull();
  });

  it('в понедельник дело видно, если оно создано в этот же понедельник', () => {
    setTestDay(MON);
    renderApp('/today', { tasks: [training({ date: MON })] });
    expect(onToday()).not.toBeNull();
  });

  it('во вторник дела нет, в среду есть', () => {
    setTestDay(TUE);
    const { unmount } = renderApp('/today', { tasks: [training()] });
    expect(onToday()).toBeNull();
    unmount();
    setTestDay(WED);
    renderApp('/today', { tasks: [training()] });
    expect(onToday()).not.toBeNull();
  });

  it('до даты начала дела нет', () => {
    setTestDay(MON);
    renderApp('/today', { tasks: [training({ date: WED })] });
    expect(onToday()).toBeNull();
  });

  it('повтор без выбранной даты — тоже по правилу', () => {
    setTestDay(MON);
    renderApp('/today', { tasks: [training({ date: undefined })] });
    expect(onToday()).not.toBeNull();
  });
});

describe('другие повторы на «Сегодня» (сегодня — среда 04.11)', () => {
  it.each([
  ['каждый день', { kind: 'daily' }, '2026-10-01', true],
  ['по будням', { kind: 'weekdays', days: [0, 1, 2, 3, 4] }, '2026-10-01', true],
  ['каждую неделю (тот же день недели)', { kind: 'weeks', every: 1 }, '2026-10-28', true],
  ['каждую неделю, другой день недели', { kind: 'weeks', every: 1 }, '2026-10-27', false],
  ['каждые 2 недели', { kind: 'weeks', every: 2 }, '2026-10-21', true],
  ['каждый месяц (то же число)', { kind: 'monthly' }, '2026-09-04', true],
  ['каждый месяц, другое число', { kind: 'monthly' }, '2026-09-05', false]] as
  const)('%s', (_name, repeat, date, visible) => {
    setTestDay(WED);
    renderApp('/today', { tasks: [training({ repeat, date })] });
    expect(onToday() !== null).toBe(visible);
  });
});

describe('календарь и счётчики', () => {
  it('неделя: дело в понедельник, среду и пятницу', () => {
    setTestDay(MON);
    renderApp('/week', { tasks: [training()] });
    const rows = screen.getByRole('region', { name: 'Неделя' }).querySelectorAll('li');
    const counts = Array.from(rows).map((li) => li.textContent?.includes('1 дело') ?? false);
    expect(counts).toEqual([true, false, true, false, true, false, false]);
  });

  it('месяц: точки в дни Пн/Ср/Пт', () => {
    setTestDay(MON);
    localStorage.setItem('sirahdo.calendarView', 'month');
    renderApp('/week', { tasks: [training()] });
    const month = screen.getByRole('region', { name: 'Месяц' });
    expect(within(month).getAllByRole('button', { name: '2, есть дела' }).length).toBeGreaterThan(0);
    expect(within(month).queryAllByRole('button', { name: '3, есть дела' })).toHaveLength(0);
    expect(within(month).getAllByRole('button', { name: '4, есть дела' }).length).toBeGreaterThan(0);
    expect(within(month).getAllByRole('button', { name: '6, есть дела' }).length).toBeGreaterThan(0);
    expect(within(month).queryAllByRole('button', { name: '8, есть дела' })).toHaveLength(0);
  });

  it('экран дня: в среду есть, во вторник нет', () => {
    const { unmount } = renderApp(`/day/${WED}`, { tasks: [training()] });
    expect(screen.queryByLabelText('Тренировка')).not.toBeNull();
    unmount();
    renderApp(`/day/${TUE}`, { tasks: [training()] });
    expect(screen.queryByLabelText('Тренировка')).toBeNull();
  });

  it('Главная: «Сегодня — 1 дело осталось» в понедельник, сфера считает дело', () => {
    setTestDay(MON);
    renderApp('/', { tasks: [training()] });
    expect(screen.getByRole('button', { name: /Сегодня/ }).textContent).toContain('1 дело осталось');
    expect(screen.getByRole('button', { name: 'Здоровье, дел: 1' })).toBeTruthy();
  });
});

describe('выполнение по вхождениям', () => {
  it('отметка в понедельник не отмечает среду; снятие возвращает вхождение', async () => {
    const user = userEvent.setup();
    setTestDay(MON);
    const task = training();
    const { unmount } = renderApp('/today', { tasks: [task] });
    await user.click(screen.getByRole('button', { name: 'Выполнить: Тренировка' }));
    await act(() => new Promise((r) => setTimeout(r, 600)));
    const saved = appState.tasks.find((t) => t.id === task.id)!;
    expect(saved.status).toBe('open');
    expect(saved.doneDates).toEqual([MON]);
    // в списке дня уже нет, в «Истории» есть
    expect(screen.queryByRole('button', { name: 'Выполнить: Тренировка' })).toBeNull();
    await user.click(screen.getByRole('button', { name: /История/ }));
    await user.click(screen.getByRole('button', { name: 'Отменить выполнение: Тренировка' }));
    expect(appState.tasks.find((t) => t.id === task.id)!.doneDates ?? []).toEqual([]);
    unmount();

    setTestDay(WED);
    renderApp('/today', { tasks: [{ ...saved }] });
    expect(screen.getByRole('button', { name: 'Выполнить: Тренировка' }).getAttribute('aria-pressed')).toBe('false');
  });
});

describe('дело со временем или повтором без даты', () => {
  function Add({ task, onId }: {task: Parameters<ReturnType<typeof useApp>['addTask']>[0];onId: (id: string) => void;}) {
    const { addTask, tasks } = useApp();
    useEffect(() => {
      onId(addTask(task));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    appState.tasks = tasks;
    return null;
  }

  const create = (task: Parameters<ReturnType<typeof useApp>['addTask']>[0]) => {
    let id = '';
    render(
      <AppProvider userId="u" initial={emptySnapshot()} needsUpload={false} offline={false}>
        <Add task={task} onId={(v) => id = v} />
      </AppProvider>
    );
    return appState.tasks.find((t) => t.id === id)!;
  };

  it('время без даты — дата сегодня', () => {
    setTestDay(MON);
    expect(create({ title: 'Звонок', time: '18:00' }).date).toBe(MON);
  });

  it('повтор без даты — дата сегодня', () => {
    setTestDay(MON);
    expect(create({ title: 'Тренировка', repeat: { kind: 'weekdays', days: [0, 2, 4] } }).date).toBe(MON);
  });

  it('без времени и повтора — без даты, как раньше', () => {
    setTestDay(MON);
    expect(create({ title: 'Когда-нибудь' }).date).toBeUndefined();
  });
});

describe('нормализация', () => {
  it('старые дела без doneDates читаются как есть; даты старше 60 дней чистятся', () => {
    setTestDay(MON);
    const snap = normalize({
      tasks: [
      { id: 'a', title: 'Старое', sphere: 'other', period: 'untilDhuhr', status: 'open' },
      { id: 'b', title: 'Повтор', sphere: 'other', period: 'untilDhuhr', status: 'open', repeat: { kind: 'daily' }, doneDates: ['2026-11-01', '2026-08-01', 'мусор', 5] }]

    })!;
    expect(snap.tasks[0]).toEqual({ id: 'a', title: 'Старое', sphere: 'other', period: 'untilDhuhr', status: 'open' });
    expect(snap.tasks[1].doneDates).toEqual(['2026-11-01']);
  });
});
