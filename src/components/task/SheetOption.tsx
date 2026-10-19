import React from 'react';
import { CheckIcon } from 'lucide-react';

interface SheetOptionProps {
  label: string;
  hint?: string;
  selected?: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}

export function SheetOption({ label, hint, selected, onClick, icon }: SheetOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors duration-150 ease-out hover:bg-canvas">
      
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span className={`flex-1 text-[15px] ${selected ? 'font-medium text-primary' : 'text-ink'}`}>
        {label}
      </span>
      {hint ? <span className="shrink-0 text-[13px] text-muted">{hint}</span> : null}
      {selected ?
      <CheckIcon className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.4} aria-hidden="true" /> :
      null}
    </button>);

}