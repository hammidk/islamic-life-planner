import React from 'react';
import { ChevronLeftIcon } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { useBack } from '../hooks/useBack';

interface ShellProps {
  children: React.ReactNode;
  /** показывать плавающую нижнюю навигацию */
  nav?: boolean;
}

export function Shell({ children, nav = false }: ShellProps) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[430px] flex-col bg-canvas">
      <main className={`flex-1 px-5 pt-3 ${nav ? 'pb-32' : 'pb-10'}`}>{children}</main>
      {nav ? <BottomNav /> : null}
    </div>);

}

interface SubHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  onBack?: () => void;
}

/** Заголовок вложенного экрана с кнопкой «назад» */
export function SubHeader({ title, subtitle, action, onBack }: SubHeaderProps) {
  const back = useBack();
  return (
    <header className="flex items-start gap-3 pb-5 pt-2">
      <button
        type="button"
        onClick={onBack ?? back}
        aria-label="Назад"
        className="-ml-2 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors duration-150 ease-out hover:bg-line/60">
        
        <ChevronLeftIcon className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[22px] font-semibold leading-tight tracking-[-0.01em] text-ink">
          {title}
        </h1>
        {subtitle ? <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </header>);

}