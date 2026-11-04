import { describe, expect, it } from 'vitest';
import { normalize } from '../utils/userData';
import { moveUnder } from '../utils/taskTree';
import { act, fireEvent, screen, within } from '@testing-library/react';
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
  it('из блока Аср: prayerId = asr, сфера «Вера», дата — открытый день; карточка в оформлении блока', async () => {
    const user = userEvent.setup();
    renderApp('/today');
    await openBlock(user, 'Аср');
    await user.click(screen.getByRole('button', { name: 'добавить пункт' }));
    const input = screen.getByRole('textbox', { name: 'Название' }) as HTMLInputElement;
    expect(input.placeholder).toBe('Новый пункт');
    expect(input.className).toContain('text-[16px]');
    expect(input.className).toContain('text-white');
    // привязку задаёт сам блок — отдельного чипа нет; остальные чипы — прозрачные пилюли при фокусе
    expect(screen.queryByText(/К намазу/)).toBeNull();
    expect(document.activeElement).toBe(input);
    // дата уже задана — чип активный (white/25), остальные — white/15
    expect(screen.getByRole('button', { name: /^Дата/ }).className).toContain('bg-white/25');
    expect(screen.getByRole('button', { name: 'Повтор' }).className).toContain('bg-white/15');
    expect(screen.getByRole('button', { name: 'Длительность' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Подробно' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Сфера/ })).toBeNull();

    await user.type(input, 'Сунна после Асра{Enter}');
    const task = appState.tasks.find((t) => t.title === 'Сунна после Асра')!;
    expect(task).toMatchObject({ prayerId: 'asr', sphere: 'faith', date: TEST_TODAY });
  });

  it('Enter три раза подряд — три задачи с тем же prayerId, поле пустое и в фокусе', async () => {
    const user = userEvent.setup();
    renderApp('/today');
    await openBlock(user, 'Магриб');
    await user.click(screen.getByRole('button', { name: 'добавить пункт' }));
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
    // созданные — строками блока, счётчик 0/3
    expect(screen.getByLabelText('Сунна')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Скрыть дела: Магриб' }).textContent).toContain('0/3');
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

describe('задачи намаза вне «Сегодня»', () => {
  const sunna = () => makeTask('Сунна', { sphere: 'faith', prayerId: 'asr', date: TEST_TODAY, time: '15:30' });

  it('на странице сферы «Вера» — обычная строка с подписью «Аср» и префиксом', () => {
    renderApp('/sphere/faith', { tasks: [sunna()] });
    const row = screen.getByLabelText('Сунна');
    expect(row.textContent).toContain('Аср');
    expect(row.textContent).toContain('Вт 15:30');
  });

  it('на экране дня и в календаре — как обычное дело', () => {
    const { unmount } = renderApp(`/day/${TEST_TODAY}`, { tasks: [sunna()] });
    expect(screen.getByLabelText('Сунна').textContent).toContain('Аср');
    unmount();
    renderApp('/week', { tasks: [sunna()] });
    const rows = Array.from(screen.getByRole('region', { name: 'Неделя' }).querySelectorAll('li'));
    expect(rows.filter((li) => li.textContent?.includes('1 дело'))).toHaveLength(1);
  });

  it('в блоке своего намаза подписи намаза нет', async () => {
    const user = userEvent.setup();
    renderApp('/today', { tasks: [sunna()] });
    await user.click(screen.getByRole('button', { name: 'Показать дела: Аср' }));
    expect(screen.getByLabelText('Сунна').textContent).not.toContain('Аср');
  });

  it('подзадача задачи намаза остаётся в его блоке', () => {
    const parent = sunna();
    const tasks = [parent, makeTask('Дуа', { sphere: 'other', date: TEST_TODAY })];
    const res = moveUnder(tasks, tasks[1].id, parent.id);
    expect(res.ok && res.tasks[1]).toMatchObject({ parentId: parent.id, prayerId: 'asr', sphere: 'faith' });
  });
});

describe('«Привязка к намазу…»', () => {
  const pick = async (user: ReturnType<typeof userEvent.setup>, title: string, option: string) => {
    fireEvent.contextMenu(screen.getByLabelText(title));
    await user.click(await screen.findByRole('button', { name: /Привязка к намазу/ }));
    await user.click(within(screen.getByRole('dialog', { name: 'Привязка к намазу' })).getByRole('button', { name: option }));
  };

  it('перенос из Аср в Магриб, затем «Без привязки»', async () => {
    const user = userEvent.setup();
    const task = makeTask('Сунна', { sphere: 'faith', prayerId: 'asr', date: TEST_TODAY });
    const sub = makeTask('Дуа', { sphere: 'faith', prayerId: 'asr', date: TEST_TODAY, parentId: task.id });
    renderApp('/sphere/faith', { tasks: [task, sub] });
    await pick(user, 'Сунна', 'Магриб');
    expect(appState.tasks.map((t) => t.prayerId)).toEqual(['maghrib', 'maghrib']);
    await pick(user, 'Сунна', 'Без привязки');
    expect(appState.tasks.map((t) => t.prayerId)).toEqual([undefined, undefined]);
  });

  it('обычную задачу можно привязать; без даты она начинается сегодня', async () => {
    const user = userEvent.setup();
    renderApp('/sphere/faith', { tasks: [makeTask('Чтение', { sphere: 'faith' })] });
    await pick(user, 'Чтение', 'Иша');
    expect(appState.tasks[0]).toMatchObject({ prayerId: 'isha', date: TEST_TODAY });
  });
});

describe('миграция старых пунктов намазов', () => {
  const old = {
    tasks: [{ id: 'a', title: 'Дело', sphere: 'other', period: 'untilDhuhr', status: 'open' }],
    checklists: {
      fajr: [
      { id: 'p1', title: 'Азкары', done: true },
      { id: 'p2', title: 'Аят аль-Курси', done: false, parentId: 'p1', note: 'после салама' },
      { id: 'p3', title: '   ', done: false }],

      tahajjud: [{ id: 't1', title: 'Витр', done: false }],
      'task-x': [{ id: 'c1', title: 'Пункт дела', done: false }]
    }
  };

  it('каждый пункт намаза — задача блока: «Вера», сегодня, без повтора; исходники на месте', () => {
    const snap = normalize(old)!;
    expect(snap.prayerItemsMigrated).toBe(true);
    const migrated = snap.tasks.filter((t) => t.prayerId);
    expect(migrated).toEqual([
    { id: 'pt_fajr_p1', title: 'Азкары', sphere: 'faith', period: 'untilDhuhr', status: 'done', date: TEST_TODAY, prayerId: 'fajr', order: 0 },
    {
      id: 'pt_fajr_p2', title: 'Аят аль-Курси', sphere: 'faith', period: 'untilDhuhr', status: 'open', date: TEST_TODAY,
      prayerId: 'fajr', order: 1, description: 'после салама', parentId: 'pt_fajr_p1'
    },
    { id: 'pt_tahajjud_t1', title: 'Витр', sphere: 'faith', period: 'untilDhuhr', status: 'open', date: TEST_TODAY, prayerId: 'tahajjud', order: 0 }]
    );
    expect(migrated.every((t) => !t.repeat && !t.doneDates)).toBe(true);
    // пункты дел не трогаются, исходные записи не удаляются
    expect(snap.checklists.fajr).toHaveLength(3);
    expect(snap.checklists['task-x']).toHaveLength(1);
    expect(snap.tasks.filter((t) => !t.prayerId)).toHaveLength(1);
  });

  it('идемпотентна: два запуска (и сохранение между ними) дают один результат', () => {
    const once = normalize(old)!;
    const twice = normalize(JSON.parse(JSON.stringify(once)))!;
    expect(twice).toEqual(once);
    // даже без флага задачи не задваиваются
    const noFlag = normalize({ ...JSON.parse(JSON.stringify(once)), prayerItemsMigrated: false })!;
    expect(noFlag.tasks).toHaveLength(once.tasks.length);
  });

  it('старые данные без новых полей не ломаются', () => {
    const snap = normalize({ tasks: [], checklists: {} })!;
    expect(snap.tasks).toEqual([]);
    expect(snap.prayerItemsMigrated).toBe(true);
    expect(normalize({})!.tasks).toEqual([]);
  });

  it('перенесённые пункты видны в блоке намаза', async () => {
    const user = userEvent.setup();
    const snap = normalize(old)!;
    renderApp('/today', { tasks: snap.tasks, checklists: snap.checklists });
    await user.click(screen.getByRole('button', { name: 'Показать дела: Тахаджуд' }));
    expect(screen.getByLabelText('Витр')).toBeTruthy();
  });
});

/** разметка строки без анимационных стилей framer и случайных id — для снапшота */
const stable = (el: HTMLElement) => {
  const copy = el.cloneNode(true) as HTMLElement;
  [copy, ...Array.from(copy.querySelectorAll<HTMLElement>('*'))].forEach((n) => {
    n.removeAttribute('style');
    n.removeAttribute('data-row-id');
  });
  return copy;
};

describe('variant: внутри блока — как прежние пункты, вне блока — как задачи', () => {
  const habit = () => makeTask('Азкары', {
    sphere: 'faith', prayerId: 'asr', date: TEST_TODAY, time: '15:30', repeat: { kind: 'daily' }, description: 'после салама\nвторая строка'
  });

  it('в блоке: только название, заметка 12px, справа время и ↻; без сферы, префикса и мета-строки; цвет блока', async () => {
    const user = userEvent.setup();
    renderApp('/today', { tasks: [habit()] });
    await openBlock(user, 'Аср');
    const row = screen.getByLabelText('Азкары');
    expect(row.textContent).toBe('Азкарыпосле салама15:30↻');
    expect(row.className).toContain('bg-primary');
    expect(row.className).not.toContain('bg-surface');
    expect(row.querySelector('svg.lucide-layers, svg.lucide-compass')).toBeNull();
    expect(within(row).getByText('после салама').className).toContain('text-[12px]');
    expect(stable(row)).toMatchSnapshot('строка в блоке намаза');
  });

  it('вне блока: обычная строка с иконкой сферы, мета-строкой и подписью намаза', () => {
    renderApp('/sphere/faith', { tasks: [habit()] });
    const row = screen.getByLabelText('Азкары');
    expect(row.textContent).toContain('Каждый день');
    expect(row.textContent).toContain('Аср');
    expect(row.className).toContain('bg-surface');
    expect(stable(row)).toMatchSnapshot('строка вне блока');
  });
});

  it('красный блок (меньше 40 минут): строки в красный цвет блока, текст белый', async () => {
    const user = userEvent.setup();
    // в 10:00 Фаджр уже не отмечен и его время вышло — блок красный
    renderApp('/today', { tasks: [makeTask('Дуа', { sphere: 'faith', prayerId: 'fajr', date: TEST_TODAY })] });
    await openBlock(user, 'Фаджр');
    const row = screen.getByLabelText('Дуа');
    expect(row.className).toContain('bg-[#B4443A]');
    expect(within(row).getByText('Дуа').className).toContain('text-white/95');
  });
