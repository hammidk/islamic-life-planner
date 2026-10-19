import React, { useState } from 'react';
import { CheckIcon, PlusIcon } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

interface ChecklistProps {
  targetId: string;
  suggestions: string[];
  /** onPrimary — внутри зелёной карточки намаза */
  tone?: 'default' | 'onPrimary';
}

export function Checklist({ targetId, suggestions, tone = 'default' }: ChecklistProps) {
  const { checklists, addChecklistItem, toggleChecklistItem } = useApp();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');

  const items = checklists[targetId] ?? [];
  const available = suggestions.filter(
    (s) => !items.some((i) => i.title.toLowerCase() === s.toLowerCase())
  );
  const onPrimary = tone === 'onPrimary';

  const add = (value: string) => {
    const name = value.trim();
    if (name) addChecklistItem(targetId, name);
    setTitle('');
  };

  return (
    <div className={`rounded-xl px-3 py-2 ${onPrimary ? 'bg-white/10' : 'bg-canvas/70'}`}>
      {items.length > 0 ?
      <ul>
          {items.map((item) =>
        <li key={item.id}>
              <button
            type="button"
            onClick={() => toggleChecklistItem(targetId, item.id)}
            aria-pressed={item.done}
            className="flex w-full items-center gap-2.5 py-1.5 text-left">
            
                <span
              className={`flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-150 ease-out ${
              onPrimary ?
              item.done ?
              'border-white bg-white' :
              'border-white/60' :
              item.done ?
              'border-primary bg-primary' :
              'border-[#CBD2C9]'}`
              }>
              
                  {item.done ?
              <CheckIcon
                className={`h-3 w-3 ${onPrimary ? 'text-primary' : 'text-white'}`}
                strokeWidth={2.8} /> :

              null}
                </span>
                <span
              className={`text-[14px] ${
              onPrimary ?
              item.done ?
              'text-white/60 line-through' :
              'text-white' :
              item.done ?
              'text-muted line-through' :
              'text-ink'}`
              }>
              
                  {item.title}
                </span>
              </button>
            </li>
        )}
        </ul> :
      null}

      {adding ?
      <div className="py-1.5">
          {available.length > 0 ?
        <div className="mb-2 flex flex-wrap gap-1.5">
              {available.map((s) =>
          <button
            key={s}
            type="button"
            onClick={() => add(s)}
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
          <div className="flex items-center gap-2">
            <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add(title)}
            placeholder="Свой пункт"
            className={`min-w-0 flex-1 bg-transparent text-[14px] focus:outline-none ${
            onPrimary ?
            'text-white placeholder:text-white/50' :
            'text-ink placeholder:text-muted/80'}`
            } />
          
            <button
            type="button"
            onClick={() => {
              add(title);
              setAdding(false);
            }}
            className={`shrink-0 text-[13px] font-medium ${
            onPrimary ? 'text-white' : 'text-primary'}`
            }>
            
              Готово
            </button>
          </div>
        </div> :

      <button
        type="button"
        onClick={() => setAdding(true)}
        className={`flex items-center gap-1 py-1.5 text-[13px] font-medium ${
        onPrimary ? 'text-white/90' : 'text-primary'}`
        }>
        
          <PlusIcon className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
          добавить пункт
        </button>
      }
    </div>);

}