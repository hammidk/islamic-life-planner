import React from 'react';
import { ChevronRightIcon } from 'lucide-react';

interface MenuRowProps {
  label: string;
  value?: string;
  onClick?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
}

export function MenuRow({ label, value, onClick, right, danger }: MenuRowProps) {
  const content =
  <>
      <span className={`text-[15px] ${danger ? 'text-[#A44A3F]' : 'text-ink'}`}>{label}</span>
      <span className="flex items-center gap-2">
        {value ? <span className="text-[13.5px] text-muted">{value}</span> : null}
        {right ?? (
      onClick ?
      <ChevronRightIcon className="h-4 w-4 text-muted" strokeWidth={1.8} aria-hidden="true" /> :
      null)}
      </span>
    </>;


  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-between px-4 py-[15px] text-left transition-colors duration-150 ease-out hover:bg-canvas/70">
        
        {content}
      </button>);

  }

  return <div className="flex w-full items-center justify-between px-4 py-[15px]">{content}</div>;
}

export function MenuGroup({
  title,
  children



}: {title?: string;children: React.ReactNode;}) {
  return (
    <section className="mb-6">
      {title ?
      <h2 className="mb-2 px-1 text-[12px] font-medium uppercase tracking-[0.08em] text-muted">
          {title}
        </h2> :
      null}
      <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-card">
        {children}
      </div>
    </section>);

}