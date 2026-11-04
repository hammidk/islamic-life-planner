import { EditableChecklist } from '../EditableChecklist';

interface DraftItem {
  id: string;
  title: string;
}

interface DraftChecklistProps {
  items: DraftItem[];
  onChange: (items: DraftItem[]) => void;
}

const newId = () => `d${Date.now()}${Math.random().toString(36).slice(2, 7)}`;

/** Подпункты ещё не созданной задачи: та же правка на месте, что и у созданной */
export function DraftChecklist({ items, onChange }: DraftChecklistProps) {
  // последний список — несколько вставок подряд в одном обработчике не теряют друг друга
  let current = items;
  const set = (next: DraftItem[]) => {
    current = next;
    onChange(next);
  };
  return (
    <EditableChecklist
      items={items}
      onRename={(id, title) => set(current.map((i) => i.id === id ? { ...i, title } : i))}
      onRemove={(id) => set(current.filter((i) => i.id !== id))}
      onInsert={(title, afterId) => {
        const item = { id: newId(), title };
        const at = afterId ? current.findIndex((i) => i.id === afterId) : -1;
        set(at === -1 ? [...current, item] : [...current.slice(0, at + 1), item, ...current.slice(at + 1)]);
        return item.id;
      }}
      addMode="inline"
      addPlaceholder="Добавить пункт"
      removable />);


}
