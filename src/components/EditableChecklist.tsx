import React, { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { CheckIcon, PlusIcon, XIcon } from 'lucide-react';
import { isSubmitEnter } from '../utils/keyboard';

export interface EditableItem {
  id: string;
  title: string;
  done?: boolean;
}

interface EditableChecklistProps {
  items: EditableItem[];
  /** без него кружок — просто метка (черновик) */
  onToggle?: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onRemove: (id: string) => void;
  /** вставить пункт после afterId (или в конец); возвращает id нового пункта */
  onInsert: (title: string, afterId?: string) => string;
  /** onPrimary — внутри зелёного блока намаза */
  tone?: 'default' | 'onPrimary';
  /** button — поле добавления открывается кнопкой «добавить пункт»; inline — поле всегда видно */
  addMode?: 'button' | 'inline';
  addPlaceholder?: string;
  /** подсказки пунктов (только у намазов) */
  suggestions?: string[];
  /** кнопка удаления у пункта (черновик) */
  removable?: boolean;
}

/**
 * Подпункты с правкой на месте, как в «Напоминаниях»: тап по тексту — поле 16px,
 * Enter сохраняет и открывает новый пункт под ним, потеря фокуса сохраняет,
 * пустой текст удаляет пункт. Фокус переносится синхронно в обработчике (на iPhone
 * клавиатура не закрывается), а поле нового пункта не перемещается в DOM.
 */
export function EditableChecklist({
  items,
  onToggle,
  onRename,
  onRemove,
  onInsert,
  tone = 'default',
  addMode = 'button',
  addPlaceholder = 'Свой пункт',
  suggestions = [],
  removable = false
}: EditableChecklistProps) {
  const onPrimary = tone === 'onPrimary';
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  /** новый пункт, открытый Enter'ом, — стоит сразу после этого пункта */
  const [pendingAfter, setPendingAfter] = useState<string | null>(null);
  const [pendingValue, setPendingValue] = useState('');
  const [adding, setAdding] = useState(addMode === 'inline');
  const [addValue, setAddValue] = useState('');
  const editRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const editingRef = useRef<string | null>(null);
  editingRef.current = editing;

  const text = onPrimary ? 'text-white' : 'text-ink';
  const doneText = onPrimary ? 'text-white/60 line-through' : 'text-muted line-through';
  const placeholder = onPrimary ? 'placeholder:text-white/50' : 'placeholder:text-muted/80';
  const inputClass = `min-w-0 flex-1 bg-transparent py-2 text-[16px] focus:outline-none ${text} ${placeholder}`;

  /** сохраняет правку; пустой текст удаляет пункт. false — пункт удалён */
  const commitEdit = (id: string, value: string): boolean => {
    const name = value.trim();
    const item = items.find((i) => i.id === id);
    if (!name) {
      onRemove(id);
      return false;
    }
    if (item && item.title !== name) onRename(id, name);
    return true;
  };

  const startEdit = (item: EditableItem) => {
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

  const box = (item: EditableItem) =>
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


  const rows: React.ReactNode[] = [];
  items.forEach((item) => {
    rows.push(
      <li key={item.id} className="flex min-h-[44px] items-center gap-1">
        {onToggle ?
        <button
          type="button"
          onClick={() => onToggle(item.id)}
          aria-pressed={Boolean(item.done)}
          aria-label={item.done ? `Снять отметку: ${item.title}` : `Отметить: ${item.title}`}
          className="-ml-2.5 flex h-11 w-11 shrink-0 items-center justify-center">

            {box(item)}
          </button> :

        <span className="-ml-2.5 flex h-11 w-11 shrink-0 items-center justify-center">{box(item)}</span>
        }
        {editing === item.id ?
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
          className={`min-w-0 flex-1 py-2 text-left text-[14px] leading-snug ${item.done ? doneText : text}`}>

            {item.title}
          </button>
        }
        {removable ?
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          aria-label={`Удалить «${item.title}»`}
          className={`flex h-11 w-9 shrink-0 items-center justify-center ${onPrimary ? 'text-white/70' : 'text-muted hover:text-ink'}`}>

            <XIcon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          </button> :
        null}
      </li>
    );
    if (pendingAfter === item.id) {
      rows.push(
        <li key="__pending" className="flex min-h-[44px] items-center gap-1">
          <span className="-ml-2.5 flex h-11 w-11 shrink-0 items-center justify-center">{box({ id: '', title: '' })}</span>
          <input
            ref={pendingRef}
            value={pendingValue}
            onChange={(e) => setPendingValue(e.target.value)}
            onKeyDown={(e) => {
              if (!isSubmitEnter(e)) return;
              e.preventDefault();
              const name = pendingValue.trim();
              if (!name) {
                setPendingAfter(null);
                return;
              }
              const id = onInsert(name, pendingAfter);
              // новый пункт встаёт перед этим полем, само поле в DOM не двигается — фокус остаётся
              flushSync(() => {
                setPendingAfter(id);
                setPendingValue('');
              });
              pendingRef.current?.focus();
            }}
            onBlur={() => {
              const name = pendingValue.trim();
              if (name && pendingAfter) onInsert(name, pendingAfter);
              setPendingAfter(null);
              setPendingValue('');
            }}
            enterKeyHint="next"
            placeholder="Новый пункт"
            aria-label="Новый пункт"
            className={inputClass} />

        </li>
      );
    }
  });

  const available = suggestions.filter((s) => !items.some((i) => i.title.toLowerCase() === s.toLowerCase()));

  const submitAdd = () => {
    const name = addValue.trim();
    if (name) onInsert(name);
    setAddValue('');
    addRef.current?.focus();
  };

  return (
    <div className={`rounded-xl px-3 py-1 ${onPrimary ? 'bg-white/10' : 'bg-canvas/70'}`}>
      {rows.length > 0 ? <ul>{rows}</ul> : null}

      {adding ?
      <div className="py-1">
          {available.length > 0 ?
        <div className="mb-1 flex flex-wrap gap-1.5 pt-1">
              {available.map((s) =>
          <button
            key={s}
            type="button"
            onClick={() => onInsert(s)}
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
                onInsert(addValue.trim());
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
              if (name) onInsert(name);
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
    </div>);

}
