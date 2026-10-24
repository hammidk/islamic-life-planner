import { useEffect, useRef } from 'react';
import { TaskComposer } from './TaskComposer';
import { useQuickAdd } from '../../contexts/QuickAddContext';
import { useTaskDraft } from '../../contexts/TaskDraftContext';
import { useOutsideTap } from '../../hooks/useOutsideTap';

/**
 * Создание дела карточкой в самом верху списка, как в «Напоминаниях».
 * Enter создаёт дело и открывает новую пустую карточку с тем же контекстом;
 * тап вне карточки создаёт дело (если есть название) и закрывает её.
 */
export function InlineCreate() {
  const { mode, commitInline, closeInline, expandDraft } = useQuickAdd();
  const { draft, updateDraft } = useTaskDraft();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const open = mode === 'inline';
  const titleRef = useRef(draft.title);
  titleRef.current = draft.title;

  useEffect(() => {
    if (!open) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    inputRef.current?.focus({ preventScroll: true });
  }, [open]);

  useOutsideTap(rootRef, open, () => {
    if (titleRef.current.trim()) commitInline();
    closeInline();
  });

  if (!open) return null;

  return (
    <div
      ref={rootRef}
      className="mb-3 rounded-card border border-primary/30 bg-surface px-4 py-3 shadow-card">
      
      <TaskComposer
        inputRef={inputRef}
        value={{
          title: draft.title,
          description: draft.description,
          date: draft.date,
          time: draft.time,
          duration: draft.duration,
          sphere: draft.sphere,
          urgent: draft.urgent,
          repeat: draft.repeat,
          reminder: draft.reminder
        }}
        onChange={(patch) => updateDraft(patch)}
        onSubmit={() => {
          if (!commitInline()) closeInline();else
          inputRef.current?.focus();
        }}
        onExpand={expandDraft} />
      
    </div>);

}
