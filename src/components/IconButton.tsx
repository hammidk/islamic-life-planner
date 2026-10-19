import React from 'react';

interface IconButtonProps {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  caption?: string;
}

export function IconButton({ label, onClick, children, caption }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-ink-soft shadow-card transition-colors duration-150 ease-out hover:border-primary/40 hover:text-primary">
      
      {children}
      {caption ? <span className="text-[12.5px]">{caption}</span> : null}
    </button>);

}