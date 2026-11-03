import { EditableChecklist } from './EditableChecklist';
import { useApp } from '../contexts/AppContext';

interface ChecklistProps {
  targetId: string;
  /** подсказки пунктов — только у намазов; у дел их нет */
  suggestions?: string[];
  /** onPrimary — внутри зелёной карточки намаза */
  tone?: 'default' | 'onPrimary';
}

/** Пункты дела или намаза: отметка, правка на месте, Enter — следующий пункт */
export function Checklist({ targetId, suggestions = [], tone = 'default' }: ChecklistProps) {
  const { checklists, addChecklistItem, toggleChecklistItem, renameChecklistItem, removeChecklistItem } = useApp();
  return (
    <EditableChecklist
      items={checklists[targetId] ?? []}
      onToggle={(id) => toggleChecklistItem(targetId, id)}
      onRename={(id, title) => renameChecklistItem(targetId, id, title)}
      onRemove={(id) => removeChecklistItem(targetId, id)}
      onInsert={(title, afterId) => addChecklistItem(targetId, title, afterId)}
      tone={tone}
      suggestions={suggestions} />);


}
