import React from 'react';
import { useParams } from 'react-router-dom';
import { Shell, SubHeader } from '../components/Shell';
import { useApp } from '../contexts/AppContext';

const sections = [
{ key: 'gratitude' as const, label: 'Благодарность' },
{ key: 'important' as const, label: 'Важное' },
{ key: 'improve' as const, label: 'Улучшить' }];


export function JournalEntryPage() {
  const { id } = useParams();
  const { journal } = useApp();
  const entry = journal.find((e) => e.id === id);

  if (!entry) {
    return (
      <Shell>
        <SubHeader title="Запись не найдена" />
      </Shell>);

  }

  return (
    <Shell>
      <SubHeader title={entry.label} subtitle="Завершение дня" />

      <div className="space-y-4">
        {sections.map((s) =>
        <section key={s.key} className="rounded-card border border-line bg-surface px-4 py-4 shadow-card">
            <h2 className="text-[12px] font-medium uppercase tracking-[0.07em] text-muted">
              {s.label}
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink">
              {entry[s.key] || '—'}
            </p>
          </section>
        )}
      </div>
    </Shell>);

}