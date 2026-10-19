import React, { useState } from 'react';
import { PlusIcon } from 'lucide-react';

interface QuickAddRowProps {
  placeholder: string;
  onAdd: (title: string) => void;
}

export function QuickAddRow({ placeholder, onAdd }: QuickAddRowProps) {
  const [title, setTitle] = useState('');

  const submit = () => {
    const name = title.trim();
    if (!name) return;
    onAdd(name);
    setTitle('');
  };

  return (
    <div className="flex items-center gap-3 py-3">
      <PlusIcon className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} aria-hidden="true" />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[16px] text-ink placeholder:text-muted/80 focus:outline-none" />
      
      {title.trim() ?
      <button
        type="button"
        onClick={submit}
        className="shrink-0 text-[13.5px] font-medium text-primary">
        
          Добавить
        </button> :
      null}
    </div>);

}