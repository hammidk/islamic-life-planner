import { describe, expect, it } from 'vitest';
import { normalize } from '../utils/userData';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appState, makeTask, renderApp } from './renderApp';
import { TEST_TODAY, setTestDay } from './setup';

describe('поле prayerId', () => {
  it('старые дела без prayerId читаются как есть, неизвестный намаз отбрасывается', () => {
    const snap = normalize({
      tasks: [
      { id: 'a', title: 'Старое', sphere: 'other', period: 'untilDhuhr', status: 'open' },
      { id: 'b', title: 'Азкары', sphere: 'faith', period: 'untilDhuhr', status: 'open', prayerId: 'fajr' },
      { id: 'c', title: 'Мусор', sphere: 'faith', period: 'untilDhuhr', status: 'open', prayerId: 'lunch' }]

    })!;
    expect(snap.tasks[0]).toEqual({ id: 'a', title: 'Старое', sphere: 'other', period: 'untilDhuhr', status: 'open' });
    expect(snap.tasks[1].prayerId).toBe('fajr');
    expect('prayerId' in snap.tasks[2]).toBe(false);
  });
});


const openBlock = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
  await user.click(screen.getByRole('button', { name: `Показать дела: ${name}` }));
};

describe('создание в блоке намаза = создание задачи', () => {
  it('из блока Аср: prayerId = asr, сфера «Вера», дата — открытый день, чип «К намазу» не снимается', async () => {
    const user = userEvent.setup();
    renderApp('/today');
    await openBlock(user, 'Аср');
    await user.click(screen.getByRole('button', { name: 'добавить задачу' }));
    expect(screen.getByText('К намазу: Аср')).toBeTruthy();
    // чип — не кнопка: снять или сменить его нельзя
    expect(screen.queryByRole('button', { name: /К намазу/ })).toBeNull();
    // остальные чипы — как у задач
    expect(screen.getByRole('button', { name: 'Сфера: Вера' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Дата/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Повтор' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Подробно' })).toBeTruthy();

    await user.type(screen.getByRole('textbox', { name: 'Название' }), 'Сунна после Асра{Enter}');
    const task = appState.tasks.find((t) => t.title === 'Сунна после Асра')!;
    expect(task).toMatchObject({ prayerId: 'asr', sphere: 'faith', date: TEST_TODAY });
  });

  it('Enter три раза подряд — три задачи с тем же prayerId, поле пустое и в фокусе', async () => {
    const user = userEvent.setup();
    renderApp('/today');
    await openBlock(user, 'Магриб');
    await user.click(screen.getByRole('button', { name: 'добавить задачу' }));
    const input = screen.getByRole('textbox', { name: 'Название' }) as HTMLInputElement;
    await user.type(input, 'Азкары{Enter}Сунна{Enter}Дуа{Enter}');
    expect(appState.tasks.map((t) => [t.title, t.prayerId, t.sphere])).toEqual([
    ['Азкары', 'maghrib', 'faith'],
    ['Сунна', 'maghrib', 'faith'],
    ['Дуа', 'maghrib', 'faith']]
    );
    const again = screen.getByRole('textbox', { name: 'Название' }) as HTMLInputElement;
    expect(again.value).toBe('');
    expect(document.activeElement).toBe(again);
    expect(screen.getByText('К намазу: Магриб')).toBeTruthy();
    // созданные — строками блока
    const block = screen.getByRole('button', { name: 'Скрыть дела: Магриб' }).closest('.bg-primary')!;
    expect(within(block as HTMLElement).getByLabelText('Сунна')).toBeTruthy();
    expect(block.textContent).toContain('0/3');
  });

  it('подсказка «+ Азкары» создаёт задачу блока', async () => {
    const user = userEvent.setup();
    renderApp('/today');
    await openBlock(user, 'Фаджр');
    await user.click(screen.getByRole('button', { name: '+ Азкары' }));
    expect(appState.tasks[0]).toMatchObject({ title: 'Азкары', prayerId: 'fajr', sphere: 'faith', date: TEST_TODAY });
    expect(screen.queryByRole('button', { name: '+ Азкары' })).toBeNull();
  });
});

describe('показ в блоке намаза', () => {
  const MON = '2026-11-02';
  const TUE = '2026-11-03';

  it('«каждый день»: в блоке в понедельник и вторник, отметка в понедельник не отмечает вторник', async () => {
    const user = userEvent.setup();
    setTestDay(MON);
    const habit = makeTask('Азкары', { sphere: 'faith', prayerId: 'fajr', date: '2026-10-01', repeat: { kind: 'daily' } });
    const { unmount } = renderApp('/today', { tasks: [habit] });
    await openBlock(user, 'Фаджр');
    expect(screen.getByLabelText('Азкары')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Выполнить: Азкары' }));
    await act(() => new Promise((r) => setTimeout(r, 600)));
    const saved = appState.tasks[0];
    expect(saved.doneDates).toEqual([MON]);
    // выполненное вхождение — в «Истории», в блоке его нет, счётчик 1/1
    expect(screen.queryByRole('button', { name: 'Выполнить: Азкары' })).toBeNull();
    expect(screen.getByRole('button', { name: /История/ }).textContent).toContain('1');
    expect(screen.getByRole('button', { name: 'Скрыть дела: Фаджр' }).textContent).toContain('1/1');
    unmount();

    setTestDay(TUE);
    renderApp('/today', { tasks: [saved] });
    await openBlock(user, 'Фаджр');
    expect(screen.getByRole('button', { name: 'Выполнить: Азкары' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('задача Асра — не строка окна, не в «Удел»/«Прочее» и не меняет «Свободно»', () => {
    const free = () => Array.from(document.querySelectorAll('button')).filter((b) => b.textContent?.startsWith('Свободно')).map((b) => b.textContent);
    const plain = renderApp('/today', { tasks: [] });
    const before = free();
    plain.unmount();
    renderApp('/today', {
      tasks: [
      makeTask('Сунна', { sphere: 'faith', prayerId: 'asr', date: TEST_TODAY, time: '15:30', duration: 60 }),
      makeTask('Дуа', { sphere: 'other', prayerId: 'asr' }),
      makeTask('Работа', { sphere: 'rizq', prayerId: 'asr' })]

    });
    // свёрнутые блоки — задач нигде нет
    expect(screen.queryByLabelText('Сунна')).toBeNull();
    expect(screen.queryByLabelText('Дуа')).toBeNull();
    expect(screen.queryByLabelText('Работа')).toBeNull();
    expect(free()).toEqual(before);
    expect(screen.getByRole('button', { name: 'Показать дела: Аср' }).textContent).toContain('0/1');
  });
});
