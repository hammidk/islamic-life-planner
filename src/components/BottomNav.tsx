import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpenIcon, CalendarDaysIcon, HomeIcon, PlusIcon } from 'lucide-react';
import { useQuickAdd } from '../contexts/QuickAddContext';
import type { TaskDraft } from '../contexts/TaskDraftContext';
import type { SphereId } from '../types';

interface NavItem {
  to: string;
  label: string;
  Icon: typeof HomeIcon;
  match: (pathname: string) => boolean;
}

const items: NavItem[] = [
{
  to: '/',
  label: 'Главная',
  Icon: HomeIcon,
  match: (p) => p === '/' || p === '/today' || p.startsWith('/sphere/')
},
{
  to: '/week',
  label: 'Календарь',
  Icon: CalendarDaysIcon,
  match: (p) => p === '/week' || p.startsWith('/day/')
},
{
  to: '/journal',
  label: 'Дневник',
  Icon: BookOpenIcon,
  match: (p) => p.startsWith('/journal') || p === '/tasks/stats'
}];


const sphereIds: SphereId[] = ['faith', 'rizq', 'health', 'family', 'ideas', 'other'];

/** Пресет новой задачи по текущему экрану: дата — только на экране конкретного дня */
function presetFor(pathname: string): Partial<TaskDraft> {
  const sphere = pathname.match(/^\/sphere\/([^/]+)/)?.[1];
  if (sphere && (sphereIds as string[]).includes(sphere)) return { sphere: sphere as SphereId };
  const day = pathname.match(/^\/day\/(\d{4}-\d{2}-\d{2})/)?.[1];
  if (day) return { date: day };
  return {};
}

export function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { openQuickAdd } = useQuickAdd();

  const renderItem = (item: NavItem) => {
    const active = item.match(pathname);
    return (
      <button
        key={item.to}
        type="button"
        // повторный тап по активной вкладке ведёт в её корень
        onClick={() => navigate(item.to, { replace: true })}
        aria-current={active ? 'page' : undefined}
        className="flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl transition-colors duration-150 ease-out">
        
        <item.Icon
          className={`h-[21px] w-[21px] transition-colors duration-150 ease-out ${
          active ? 'text-primary' : 'text-muted'}`
          }
          strokeWidth={active ? 2.1 : 1.7}
          aria-hidden="true" />
        
        <span
          className={`whitespace-nowrap text-[10px] leading-none transition-colors duration-150 ease-out ${
          active ? 'font-medium text-primary' : 'text-muted'}`
          }>
          
          {item.label}
        </span>
      </button>);

  };

  return (
    <nav
      aria-label="Основная навигация"
      className="pointer-events-none fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 px-4 pb-5">
      
      <div className="pointer-events-auto mx-auto flex items-center justify-between rounded-[26px] border border-line/80 bg-surface/95 px-2 py-1.5 shadow-nav backdrop-blur">
        {items.slice(0, 2).map(renderItem)}

        <button
          type="button"
          onClick={() => openQuickAdd(presetFor(pathname))}
          aria-label="Создать задачу"
          className="mx-1 flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-[0_6px_16px_rgba(31,90,68,0.32)] transition-transform duration-150 ease-out active:scale-95">
          
          <PlusIcon className="h-6 w-6" strokeWidth={2.2} aria-hidden="true" />
        </button>

        {items.slice(2).map(renderItem)}
      </div>
    </nav>);

}