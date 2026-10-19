import React from 'react';

interface SegmentedControlProps<T extends string> {
  options: {id: T;label: string;}[];
  value: T;
  onChange: (id: T) => void;
  label?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label = 'Режим просмотра'
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex gap-1 rounded-2xl border border-line bg-surface p-1">
      
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(o.id)}
            className={`flex-1 whitespace-nowrap rounded-[14px] px-2 py-2 text-[13.5px] transition-colors duration-150 ease-out ${
            active ? 'bg-primary-tint font-medium text-primary' : 'text-muted hover:text-ink-soft'}`
            }>
            
            {o.label}
          </button>);

      })}
    </div>);

}