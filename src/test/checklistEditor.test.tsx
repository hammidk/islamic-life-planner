import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChecklistEditor } from '../components/checklist/ChecklistEditor';
import type { ChecklistUpdate } from '../components/checklist/ChecklistEditor';
import { indentNode, insertNodeAfter, outdentNode, removeNode, reorderNodes, restoreNodes } from '../utils/taskTree';
import type { ChecklistItem } from '../types';

const it_ = (id: string, title = id, patch: Partial<ChecklistItem> = {}): ChecklistItem => ({ id, title, done: false, ...patch });
const ids = (items: ChecklistItem[]) => items.map((i) => (i.parentId ? `${i.parentId}>` : '') + i.id);

describe('дерево на пунктах чек-листа', () => {
  it('indent: подпункт пункта выше, встаёт последним подпунктом', () => {
    const items = [it_('a'), it_('a1', 'a1', { parentId: 'a' }), it_('b')];
    const r = indentNode(items, 'b', 'a');
    expect(r.ok && ids(r.items)).toEqual(['a', 'a>a1', 'a>b']);
  });

  it('лимит уровней: подпункт глубже не идёт, пункт с подпунктами не вкладывается, выше ничего', () => {
    const items = [it_('a'), it_('a1', 'a1', { parentId: 'a' }), it_('b'), it_('b1', 'b1', { parentId: 'b' })];
    expect(indentNode(items, 'a1', 'a')).toEqual({ ok: false, reason: 'tooDeep' });
    expect(indentNode(items, 'b', 'a')).toEqual({ ok: false, reason: 'hasChildren' });
    expect(indentNode(items, 'a', undefined)).toEqual({ ok: false, reason: 'noAbove' });
    expect(indentNode([it_('x'), it_('y')], 'y', 'y')).toEqual({ ok: false, reason: 'cycle' });
  });

  it('outdent: подпункт встаёт сразу после родителя и его подпунктов', () => {
    const items = [it_('a'), it_('a1', 'a1', { parentId: 'a' }), it_('a2', 'a2', { parentId: 'a' }), it_('b')];
    expect(ids(outdentNode(items, 'a1'))).toEqual(['a', 'a>a2', 'a1', 'b']);
  });

  it('удаление с подпунктами и возврат на те же места', () => {
    const items = [it_('a'), it_('a1', 'a1', { parentId: 'a' }), it_('b')];
    const { items: rest, removed } = removeNode(items, 'a');
    expect(ids(rest)).toEqual(['b']);
    expect(ids(restoreNodes(rest, removed))).toEqual(['a', 'a>a1', 'b']);
  });

  it('вставка после подпункта — соседний подпункт; перестановка везёт подпункты с пунктом', () => {
    const items = [it_('a'), it_('a1', 'a1', { parentId: 'a' }), it_('b')];
    expect(ids(insertNodeAfter(items, 'a1', it_('n')))).toEqual(['a', 'a>a1', 'a>n', 'b']);
    expect(ids(insertNodeAfter(items, 'a', it_('n')))).toEqual(['a', 'a>a1', 'n', 'b']);
    expect(ids(reorderNodes(items, ['b', 'a']))).toEqual(['b', 'a', 'a>a1']);
  });
});

/** редактор со своим состоянием, как его используют Checklist и DraftChecklist */
let latest: ChecklistItem[] = [];
let seq = 0;
function Harness({ initial, nesting = true }: {initial: ChecklistItem[];nesting?: boolean;}) {
  const [items, setItems] = useState(initial);
  latest = items;
  const update: ChecklistUpdate<ChecklistItem> = (fn) => setItems((cur) => fn(cur));
  return (
    <ChecklistEditor
      items={items}
      update={update}
      create={(title) => ({ id: `n${++seq}`, title, done: false })}
      allowNesting={nesting}
      allowNote />);


}

describe('ChecklistEditor', () => {
  it('добавить пункт: Enter создаёт следующий и оставляет фокус', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[]} />);
    await user.click(screen.getByRole('button', { name: 'добавить пункт' }));
    const add = screen.getByPlaceholderText('Свой пункт');
    expect(add.className).toContain('text-[16px]');
    await user.type(add, 'Азкары{Enter}Дуа{Enter}');
    expect(latest.map((i) => i.title)).toEqual(['Азкары', 'Дуа']);
    expect(document.activeElement).toBe(add);
  });

  it('тап по тексту — правка на месте, Enter сохраняет и открывает следующий; пустое название удаляет', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[it_('a', 'Коран'), it_('b', 'Дуа')]} />);
    await user.click(screen.getByRole('button', { name: 'Коран' }));
    const edit = screen.getByRole('textbox', { name: 'Пункт' });
    await user.type(edit, ' — 1 джуз{Enter}');
    const next = screen.getByRole('textbox', { name: 'Новый пункт' });
    expect(document.activeElement).toBe(next);
    await user.type(next, 'Тафсир{Enter}');
    expect(document.activeElement).toBe(next);
    expect(latest.map((i) => i.title)).toEqual(['Коран — 1 джуз', 'Тафсир', 'Дуа']);

    await user.click(document.body);
    await user.click(screen.getByRole('button', { name: 'Дуа' }));
    await user.clear(screen.getByRole('textbox', { name: 'Пункт' }));
    await user.click(document.body);
    expect(latest.map((i) => i.title)).toEqual(['Коран — 1 джуз', 'Тафсир']);
  });

  it('подпункт: под родителем с линией, Enter после подпункта создаёт соседний подпункт, «Вынести»', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[it_('a', 'Коран'), it_('b', 'Аят', { parentId: 'a' })]} />);
    expect(screen.getByLabelText('Аят').closest('.border-l')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Аят' }));
    await user.type(screen.getByRole('textbox', { name: 'Пункт' }), '{Enter}');
    await user.type(screen.getByRole('textbox', { name: 'Новый пункт' }), 'Тафсир{Enter}');
    expect(ids(latest)).toEqual(['a', 'a>b', 'a>n' + seq]);

    const row = screen.getByLabelText('Аят').closest('div.relative')!.parentElement!;
    await user.click(within(row).getByRole('button', { name: 'Вынести', hidden: true }));
    expect(latest.find((i) => i.id === 'b')!.parentId).toBeUndefined();
  });

  it('меню по долгому нажатию: «Сделать подпунктом», «Описание» — заметка видна под названием', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[it_('a', 'Коран'), it_('b', 'Дуа')]} />);
    fireEvent.contextMenu(screen.getByLabelText('Дуа'));
    let dialog = await screen.findByRole('dialog', { name: 'Дуа' });
    await user.click(within(dialog).getByRole('button', { name: 'Сделать подпунктом' }));
    expect(latest.find((i) => i.id === 'b')!.parentId).toBe('a');

    fireEvent.contextMenu(screen.getByLabelText('Коран'));
    dialog = await screen.findByRole('dialog', { name: 'Коран' });
    // у пункта с подпунктами «Сделать подпунктом» нет
    expect(within(dialog).queryByRole('button', { name: 'Сделать подпунктом' })).toBeNull();
    await user.click(within(dialog).getByRole('button', { name: 'Описание' }));
    dialog = screen.getByRole('dialog', { name: 'Описание' });
    const note = within(dialog).getByRole('textbox', { name: 'Заметка' });
    expect(note.className).toContain('text-[16px]');
    expect(within(dialog).getByRole('textbox', { name: 'Название пункта' }).className).toContain('text-[16px]');
    await user.type(note, 'Сура Аль-Мульк{Enter}после Иша');
    await user.click(within(dialog).getByRole('button', { name: 'Готово' }));
    expect(latest[0].note).toBe('Сура Аль-Мульк\nпосле Иша');
    // первая строка заметки — под названием, серым 12px в одну строку
    const line = screen.getByText('Сура Аль-Мульк');
    expect(line.closest('button')!.textContent).toBe('КоранСура Аль-Мульк');
    expect(line.className).toContain('text-[12px]');
    expect(line.className).toContain('truncate');
  });

  it('у подпунктов дел вложенности нет: свайп вправо и меню её не предлагают', async () => {
    render(<Harness initial={[it_('a', 'Купить'), it_('b', 'Позвонить')]} nesting={false} />);
    fireEvent.contextMenu(screen.getByLabelText('Позвонить'));
    const dialog = await screen.findByRole('dialog', { name: 'Позвонить' });
    expect(within(dialog).queryByRole('button', { name: 'Сделать подпунктом' })).toBeNull();
    expect(screen.queryByText('Подзадача')).toBeNull(); // слоя свайпа вправо нет
  });
});
