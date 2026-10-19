import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRightIcon } from 'lucide-react';
import { Shell, SubHeader } from '../components/Shell';
import { useApp } from '../contexts/AppContext';

export function JournalHistory() {
  const navigate = useNavigate();
  const { journal } = useApp();

  return (
    <Shell>
      <SubHeader title="Записи дневника" subtitle={journal.length > 0 ? `${journal.length} записей` : undefined} />

      {journal.length === 0 ?
      <p className="px-1 text-[14px] leading-relaxed text-muted">
          Пока нет записей. Завершите день в дневнике — и запись появится здесь.
        </p> :

      <div className="divide-y divide-line rounded-card border border-line bg-surface shadow-card">
        {journal.map((entry) =>
        <button
          key={entry.id}
          type="button"
          onClick={() => navigate(`/journal/entry/${entry.id}`)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-150 ease-out hover:bg-canvas/60">
          
            <div className="min-w-0 flex-1">
              <p className="text-[15px] text-ink">{entry.label}</p>
              <p className="mt-0.5 truncate text-[13px] text-muted">{entry.gratitude}</p>
            </div>
            <ChevronRightIcon
            className="h-4 w-4 shrink-0 text-muted"
            strokeWidth={1.8}
            aria-hidden="true" />
          
          </button>
        )}
      </div>
      }
    </Shell>);

}