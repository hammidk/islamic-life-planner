import React, { useState } from 'react';
import { PlusIcon, XIcon } from 'lucide-react';
import { taskChecklistSuggestions } from '../../data/taskValues';

interface DraftChecklistProps {
  items: string[];
  onChange: (items: string[]) => void;
}

/** Подпункты ещё не созданной задачи */
export function DraftChecklist({ items, onChange }: DraftChecklistProps) {
  const [title, setTitle] = useState('');
  const available = taskChecklistSuggestions.filter((s) => !items.includes(s));

  const add = (value: string) => {
    const name = value.trim();
    if (name && !items.includes(name)) onChange([...items, name]);
    setTitle('');
  };

  return (
    <div className="rounded-xl bg-canvas/70 px-3 py-2">
      {items.map((item) =>
      <div key={item} className="flex items-center gap-2.5 py-1.5">
          <span className="h-[17px] w-[17px] shrink-0 rounded-[5px] border border-[#CBD2C9]" aria-hidden="true" />
          <span className="flex-1 text-[14px] text-ink">{item}</span>
          <button
          type="button"
          onClick={() => onChange(items.filter((i) => i !== item))}
          aria-label={`Удалить «${item}»`}
          className="text-muted transition-colors duration-150 ease-out hover:text-ink">
          
            <XIcon className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      )}
      {available.length > 0 ?
      <div className="flex flex-wrap gap-1.5 py-1.5">
          {available.map((s) =>
        <button
          key={s}
          type="button"
          onClick={() => add(s)}
          className="rounded-full border border-line bg-surface px-2.5 py-1 text-[12.5px] text-ink-soft transition-colors duration-150 ease-out hover:border-primary/40">
          
              + {s}
            </button>
        )}
        </div> :
      null}
      <div className="flex items-center gap-2 py-1.5">
        <PlusIcon className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.2} aria-hidden="true" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add(title)}
          onBlur={() => add(title)}
          placeholder="Добавить пункт"
          className="min-w-0 flex-1 bg-transparent text-[16px] text-ink placeholder:text-muted/80 focus:outline-none" />
        
      </div>
    </div>);

}