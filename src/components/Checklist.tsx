import { ChecklistEditor } from './checklist/ChecklistEditor';
import { useApp } from '../contexts/AppContext';
import type { ChecklistItem } from '../types';

interface ChecklistProps {
  targetId: string;
  /** подсказки пунктов — только у намазов; у дел их нет */
  suggestions?: string[];
  /** onPrimary — внутри зелёной карточки намаза */
  tone?: 'default' | 'onPrimary';
  /** непрозрачный фон списка и строк */
  surface?: string;
  /** подпункты и описание — у пунктов намаза */
  allowNesting?: boolean;
  allowNote?: boolean;
}

const newId = () => `c${Date.now()}${Math.random().toString(36).slice(2, 7)}`;

/** Пункты дела или намаза: данные из контекста, поведение — ChecklistEditor */
export function Checklist({
  targetId,
  suggestions = [],
  tone = 'default',
  surface,
  allowNesting = false,
  allowNote = false
}: ChecklistProps) {
  const { checklists, updateChecklist } = useApp();
  return (
    <ChecklistEditor<ChecklistItem>
      items={checklists[targetId] ?? []}
      update={(fn) => updateChecklist(targetId, fn)}
      create={(title) => ({ id: newId(), title, done: false })}
      tone={tone}
      surface={surface}
      allowNesting={allowNesting}
      allowNote={allowNote}
      suggestions={suggestions} />);


}
