import { ChecklistEditor } from '../checklist/ChecklistEditor';

interface DraftItem {
  id: string;
  title: string;
}

interface DraftChecklistProps {
  items: DraftItem[];
  onChange: (items: DraftItem[]) => void;
}

const newId = () => `d${Date.now()}${Math.random().toString(36).slice(2, 7)}`;

/** Подпункты ещё не созданной задачи: та же правка на месте и жесты, что и у созданной */
export function DraftChecklist({ items, onChange }: DraftChecklistProps) {
  // последний список — несколько изменений подряд в одном обработчике не теряют друг друга
  const current = { items };
  return (
    <ChecklistEditor<DraftItem>
      items={items}
      update={(fn) => {
        current.items = fn(current.items);
        onChange(current.items);
      }}
      create={(title) => ({ id: newId(), title })}
      toggleable={false}
      surface="bg-[#F8F9F7]"
      addMode="inline"
      addPlaceholder="Добавить пункт"
      removable />);


}
