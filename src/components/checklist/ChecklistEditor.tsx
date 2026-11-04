import React, { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { CheckIcon, CornerDownRightIcon, CornerUpLeftIcon, FileTextIcon, PlusIcon, Trash2Icon, XIcon } from 'lucide-react';
import { SwipeRow } from '../task/SwipeRow';
import { SortableList } from '../task/SortableList';
import type { DragRowState } from '../task/SortableList';
import { BottomSheet } from '../BottomSheet';
import { isSubmitEnter } from '../../utils/keyboard';
import { showToast } from '../../utils/toast';
import {
  buildTaskTree,
  canIndent,
  collectSubtree,
  indentNode,
  insertNodeAfter,
  outdentNode,
  refusalText,
  removeNode,
  reorderNodes,
  restoreNodes } from
'../../utils/taskTree';
import type { TaskNode } from '../../utils/taskTree';

/** Пункт дела, намаза или черновика */
export interface EditorItem {
  id: string;
  title: string;
  done?: boolean;
  parentId?: string;
  note?: string;
}

export type ChecklistUpdate<T extends EditorItem> = (fn: (items: T[]) => T[]) => void;

interface ChecklistEditorProps<T extends EditorItem> {
  items: T[];
  /** все изменения — функцией от актуального списка */
  update: ChecklistUpdate<T>;
  /** новый пункт с этим названием */
  create: (title: string) => T;
  /** кружок-отметка; без него кружок — просто метка (черновик) */
  toggleable?: boolean;
  /** подпункты (два уровня) */
  allowNesting?: boolean;
  /** описание пункта */
  allowNote?: boolean;
  /** onPrimary — внутри зелёного блока намаза */
  tone?: 'default' | 'onPrimary';
  /** непрозрачный фон строк и списка (под строкой — слой действий свайпа) */
  surface?: string;
  /** button — поле добавления открывается кнопкой «добавить пункт»; inline — поле всегда видно */
  addMode?: 'button' | 'inline';
  addPlaceholder?: string;
  /** подсказки пунктов (только у намазов) */
  suggestions?: string[];
  /** кнопка ✕ у пункта (черновик) */
  removable?: boolean;
}

type SheetView = 'menu' | 'note';

/**
 * Пункты с поведением дел: тап — правка на месте, Enter — следующий пункт, пустое
 * название удаляет. Свайп влево — «Удалить» (у подпункта ещё «Вынести»), полный —
 * удаляет с «Отменить»; свайп вправо — подпункт пункта выше; долгое нажатие —
 * перетаскивание, отпустить на месте — меню. Подпункты едут вместе с пунктом.
 */
export function ChecklistEditor<T extends EditorItem>({
  items,
  update,
  create,
  toggleable = true,
  allowNesting = false,
  allowNote = false,
  tone = 'default',
  surface = 'bg-canvas',
  addMode = 'button',
  addPlaceholder = 'Свой пункт',
  suggestions = [],
  removable = false
}: ChecklistEditorProps<T>) {
  const onPrimary = tone === 'onPrimary';
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  /** новый пункт, открытый Enter'ом, — стоит сразу после этого пункта (и его подпунктов) */
  const [pendingAfter, setPendingAfter] = useState<string | null>(null);
  const [pendingValue, setPendingValue] = useState('');
  const [adding, setAdding] = useState(addMode === 'inline');
  const [addValue, setAddValue] = useState('');
  const [sheet, setSheet] = useState<{id: string;view: SheetView;} | null>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const editingRef = useRef<string | null>(null);
  editingRef.current = editing;

  const text = onPrimary ? 'text-white' : 'text-ink';
  const muted = onPrimary ? 'text-white/65' : 'text-muted';
  const doneText = onPrimary ? 'text-white/60 line-through' : 'text-muted line-through';
  const placeholder = onPrimary ? 'placeholder:text-white/50' : 'placeholder:text-muted/80';
  const inputClass = `min-w-0 flex-1 bg-transparent py-2 text-[16px] focus:outline-none ${text} ${placeholder}`;

  const nodes = buildTaskTree(items);
  const sheetItem = sheet ? items.find((i) => i.id === sheet.id) ?? null : null;

  /* ---------- изменения ---------- */

  const insert = (title: string, afterId?: string): string => {
    const item = create(title);
    update((cur) => insertNodeAfter(cur, afterId, item));
    return item.id;
  };

  const remove = (id: string, withToast = true) => {
    const { removed } = removeNode(items, id);
    update((cur) => removeNode(cur, id).items);
    if (withToast || removed.length > 1) {
      showToast(removed.length > 1 ? 'Пункт и подпункты удалены' : 'Пункт удалён', {
        label: 'Отменить',
        run: () => update((cur) => restoreNodes(cur, removed))
      });
    }
  };

  const rename = (id: string, title: string) =>
  update((cur) => cur.map((i) => i.id === id ? { ...i, title } : i));

  const indentUnder = (id: string, aboveId: string | undefined) => {
    const result = indentNode(items, id, aboveId);
    if (!result.ok) {
      showToast(refusalText[result.reason]);
      return;
    }
    update((cur) => {
      const r = indentNode(cur, id, aboveId);
      return r.ok ? r.items : cur;
    });
  };

  const outdent = (id: string) => update((cur) => outdentNode(cur, id));

  /** пункт непосредственно выше: верхний пункт перед этим */
  const aboveOf = (id: string) => {
    const index = nodes.findIndex((n) => n.task.id === id);
    return index > 0 ? nodes[index - 1].task.id : undefined;
  };

  /* ---------- правка на месте ---------- */

  /** сохраняет правку; пустой текст удаляет пункт. false — пункт удалён */
  const commitEdit = (id: string, value: string): boolean => {
    const name = value.trim();
    const item = items.find((i) => i.id === id);
    if (!name) {
      remove(id, false);
      return false;
    }
    if (item && item.title !== name) rename(id, name);
    return true;
  };

  const startEdit = (item: T) => {
    flushSync(() => {
      setPendingAfter(null);
      setEditing(item.id);
      setEditValue(item.title);
    });
    editRef.current?.focus();
  };

  const openPendingAfter = (id: string) => {
    flushSync(() => {
      setEditing(null);
      setPendingAfter(id);
      setPendingValue('');
    });
    pendingRef.current?.focus();
  };

  /* ---------- строки ---------- */

  const box = (item: {done?: boolean;}) =>
  <span
    className={`flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-150 ease-out ${
    onPrimary ?
    item.done ?
    'border-white bg-white' :
    'border-white/60' :
    item.done ?
    'border-primary bg-primary' :
    'border-[#CBD2C9]'}`
    }
    aria-hidden="true">

      {item.done ?
    <CheckIcon className={`h-3 w-3 ${onPrimary ? 'text-primary' : 'text-white'}`} strokeWidth={2.8} /> :
    null}
    </span>;


  const pendingRow =
  <div className="flex min-h-[44px] items-center gap-1">
      <span className="-ml-2.5 flex h-11 w-11 shrink-0 items-center justify-center">{box({})}</span>
      <input
      ref={pendingRef}
      value={pendingValue}
      onChange={(e) => setPendingValue(e.target.value)}
      onKeyDown={(e) => {
        if (!isSubmitEnter(e)) return;
        e.preventDefault();
        const name = pendingValue.trim();
        if (!name || !pendingAfter) {
          setPendingAfter(null);
          return;
        }
        const id = insert(name, pendingAfter);
        // новый пункт встаёт перед этим полем, само поле в DOM не двигается — фокус остаётся
        flushSync(() => {
          setPendingAfter(id);
          setPendingValue('');
        });
        pendingRef.current?.focus();
      }}
      onBlur={() => {
        const name = pendingValue.trim();
        if (name && pendingAfter) insert(name, pendingAfter);
        setPendingAfter(null);
        setPendingValue('');
      }}
      enterKeyHint="next"
      placeholder="Новый пункт"
      aria-label="Новый пункт"
      className={inputClass} />

    </div>;


  const pendingParent = pendingAfter ? items.find((i) => i.id === pendingAfter)?.parentId : undefined;
  /** поле нового пункта — в том же уровне, что и пункт, после которого оно открыто */
  const extraFor = (level: string | null) =>
  pendingAfter && (pendingParent ?? null) === level ?
  { afterId: pendingAfter, key: '__pending', node: pendingRow } :
  null;

  const row = (item: T, drag: DragRowState, nested: boolean) => {
    const isEditing = editing === item.id;
    const firstNoteLine = item.note?.split('\n').find((l) => l.trim())?.trim();
    return (
      <SwipeRow
        id={`ci:${item.id}`}
        label={item.title}
        surface={surface}
        disabled={isEditing}
        onDelete={() => remove(item.id)}
        onIndent={allowNesting ? () => indentUnder(item.id, nested ? undefined : aboveOf(item.id)) : undefined}
        onOutdent={nested ? () => outdent(item.id) : undefined}
        onLongPress={() => setSheet({ id: item.id, view: 'menu' })}
        dragListeners={isEditing ? undefined : drag.dragListeners}
        dragging={drag.isDragging}
        nestTarget={drag.nestTarget}>

        <div className="flex min-h-[44px] items-center gap-1">
          {toggleable ?
          <button
            type="button"
            onClick={() => update((cur) => cur.map((i) => i.id === item.id ? { ...i, done: !i.done } : i))}
            aria-pressed={Boolean(item.done)}
            aria-label={item.done ? `Снять отметку: ${item.title}` : `Отметить: ${item.title}`}
            className="-ml-2.5 flex h-11 w-11 shrink-0 items-center justify-center">

              {box(item)}
            </button> :

          <span className="-ml-2.5 flex h-11 w-11 shrink-0 items-center justify-center">{box(item)}</span>
          }
          {isEditing ?
          <input
            ref={editRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (!isSubmitEnter(e)) return;
              e.preventDefault();
              if (commitEdit(item.id, editValue)) openPendingAfter(item.id);else
              setEditing(null);
            }}
            onBlur={() => {
              if (editingRef.current !== item.id) return;
              commitEdit(item.id, editValue);
              setEditing(null);
            }}
            enterKeyHint="next"
            aria-label="Пункт"
            className={inputClass} /> :


          <button
            type="button"
            onClick={() => startEdit(item)}
            className="min-w-0 flex-1 py-2 text-left">

              <span className={`block text-[14px] leading-snug ${item.done ? doneText : text}`}>{item.title}</span>
              {firstNoteLine ?
            <span className={`mt-0.5 block truncate text-[12px] ${muted}`}>{firstNoteLine}</span> :
            null}
            </button>
          }
          {removable ?
          <button
            type="button"
            onClick={() => remove(item.id)}
            aria-label={`Удалить «${item.title}»`}
            className={`flex h-11 w-9 shrink-0 items-center justify-center ${onPrimary ? 'text-white/70' : 'text-muted hover:text-ink'}`}>

              <XIcon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            </button> :
          null}
        </div>
      </SwipeRow>);

  };

  const overlay = (item: T) =>
  <div className={`flex min-h-[44px] items-center gap-2 rounded-xl px-2 ${surface}`}>
      {box(item)}
      <span className={`text-[14px] ${text}`}>{item.title}</span>
    </div>;


  const renderNode = (node: TaskNode<T>, drag: DragRowState) =>
  <div>
      {row(node.task, drag, Boolean(node.parentTitle))}
      {node.children.length > 0 && !drag.isDragging ?
    <div className={`ml-[11px] border-l pl-[17px] ${onPrimary ? 'border-white/30' : 'border-line'}`}>
          <SortableList
        items={node.children}
        getId={(i) => i.id}
        onReorder={(ids) => update((cur) => reorderNodes(cur, ids))}
        onMenu={(i) => setSheet({ id: i.id, view: 'menu' })}
        renderOverlay={overlay}
        extra={extraFor(node.task.id)}
        renderItem={(sub, subDrag) => row(sub, subDrag, true)} />

        </div> :
    null}
    </div>;


  /* ---------- меню и описание ---------- */

  const closeSheet = () => {
    const open = sheet;
    setSheet(null);
    // пустое название в окне описания удаляет пункт
    if (open?.view === 'note' && sheetItem && !sheetItem.title.trim()) remove(sheetItem.id);
  };

  const sheetActions = (item: T) => {
    const nested = Boolean(item.parentId && items.some((i) => i.id === item.parentId));
    const hasChildren = collectSubtree(items, item.id).length > 1;
    const actions: {key: string;label: string;icon: React.ReactNode;danger?: boolean;run: () => void;}[] = [];
    const iconClass = 'h-[18px] w-[18px]';
    if (allowNote) {
      actions.push({
        key: 'note',
        label: 'Описание',
        icon: <FileTextIcon className={iconClass} strokeWidth={1.8} />,
        run: () => setSheet({ id: item.id, view: 'note' })
      });
    }
    if (allowNesting && nested) {
      actions.push({
        key: 'outdent',
        label: 'Вынести',
        icon: <CornerUpLeftIcon className={iconClass} strokeWidth={1.8} />,
        run: () => {
          setSheet(null);
          outdent(item.id);
        }
      });
    } else if (allowNesting && !hasChildren && canIndent(items, item.id, aboveOf(item.id)) === null) {
      actions.push({
        key: 'indent',
        label: 'Сделать подпунктом',
        icon: <CornerDownRightIcon className={iconClass} strokeWidth={1.8} />,
        run: () => {
          setSheet(null);
          indentUnder(item.id, aboveOf(item.id));
        }
      });
    }
    actions.push({
      key: 'delete',
      label: 'Удалить',
      icon: <Trash2Icon className={iconClass} strokeWidth={1.8} />,
      danger: true,
      run: () => {
        setSheet(null);
        remove(item.id);
      }
    });
    return actions;
  };

  /* ---------- поле добавления ---------- */

  const available = suggestions.filter((s) => !items.some((i) => i.title.toLowerCase() === s.toLowerCase()));

  const submitAdd = () => {
    const name = addValue.trim();
    if (name) insert(name);
    setAddValue('');
    addRef.current?.focus();
  };

  return (
    <div className={`rounded-xl px-3 py-1 ${surface}`}>
      {nodes.length > 0 ?
      <SortableList
        items={nodes}
        getId={(n) => n.task.id}
        onReorder={(ids) => update((cur) => reorderNodes(cur, ids))}
        onMenu={(n) => setSheet({ id: n.task.id, view: 'menu' })}
        canNest={allowNesting ? (n, parent) => n.children.length === 0 && canIndent(items, n.task.id, parent.task.id) === null : undefined}
        onNest={(n, parent) => indentUnder(n.task.id, parent.task.id)}
        renderOverlay={(n) => overlay(n.task)}
        extra={extraFor(null)}
        renderItem={renderNode} /> :

      null}

      {adding ?
      <div className="py-1">
          {available.length > 0 ?
        <div className="mb-1 flex flex-wrap gap-1.5 pt-1">
              {available.map((s) =>
          <button
            key={s}
            type="button"
            onClick={() => insert(s)}
            className={`rounded-full border px-2.5 py-1 text-[12.5px] transition-colors duration-150 ease-out ${
            onPrimary ?
            'border-white/40 text-white hover:bg-white/10' :
            'border-line bg-surface text-ink-soft hover:border-primary/40'}`
            }>

                  + {s}
                </button>
          )}
            </div> :
        null}
          <div className="flex min-h-[44px] items-center gap-2">
            {addMode === 'inline' ?
          <PlusIcon className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.2} aria-hidden="true" /> :
          null}
            <input
            ref={addRef}
            autoFocus={addMode === 'button'}
            value={addValue}
            onChange={(e) => setAddValue(e.target.value)}
            onKeyDown={(e) => {
              if (isSubmitEnter(e)) {
                e.preventDefault();
                submitAdd();
              }
            }}
            onBlur={() => {
              if (addMode === 'inline' && addValue.trim()) {
                insert(addValue.trim());
                setAddValue('');
              }
            }}
            enterKeyHint="next"
            placeholder={addPlaceholder}
            className={inputClass} />

            {addMode === 'button' ?
          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              const name = addValue.trim();
              if (name) insert(name);
              setAddValue('');
              setAdding(false);
            }}
            className={`shrink-0 text-[13px] font-medium ${onPrimary ? 'text-white' : 'text-primary'}`}>

                Готово
              </button> :
          null}
          </div>
        </div> :

      <button
        type="button"
        onClick={() => setAdding(true)}
        className={`flex min-h-[44px] items-center gap-1 text-[13px] font-medium ${onPrimary ? 'text-white/90' : 'text-primary'}`}>

          <PlusIcon className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
          добавить пункт
        </button>
      }

      <BottomSheet
        open={Boolean(sheet && sheetItem)}
        title={sheet?.view === 'note' ? 'Описание' : sheetItem?.title ?? ''}
        onClose={closeSheet}>

        {sheetItem && sheet?.view === 'menu' ?
        <div className="-mx-3">
            {sheetActions(sheetItem).map((a) =>
          <button
            key={a.key}
            type="button"
            onClick={a.run}
            className={`flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] transition-colors duration-150 ease-out hover:bg-canvas ${
            a.danger ? 'text-[#A44A3F]' : 'text-ink'}`
            }>

                <span className={a.danger ? '' : 'text-ink-soft'}>{a.icon}</span>
                {a.label}
              </button>
          )}
          </div> :
        null}
        {sheetItem && sheet?.view === 'note' ?
        <div className="flex flex-col gap-2 pb-1">
            <input
            value={sheetItem.title}
            onChange={(e) => rename(sheetItem.id, e.target.value)}
            aria-label="Название пункта"
            placeholder="Название"
            className="w-full rounded-xl border border-line bg-canvas px-3 py-3 text-[16px] text-ink focus:border-primary/50 focus:outline-none" />

            <textarea
            value={sheetItem.note ?? ''}
            onChange={(e) =>
            update((cur) => cur.map((i) => i.id === sheetItem.id ? { ...i, note: e.target.value || undefined } : i))
            }
            aria-label="Заметка"
            placeholder="Заметка"
            rows={4}
            className="w-full resize-none rounded-xl border border-line bg-canvas px-3 py-3 text-[16px] leading-relaxed text-ink focus:border-primary/50 focus:outline-none" />

            <button
            type="button"
            onClick={closeSheet}
            className="min-h-[48px] rounded-xl bg-primary text-[15px] font-medium text-white">

              Готово
            </button>
          </div> :
        null}
      </BottomSheet>
    </div>);

}
