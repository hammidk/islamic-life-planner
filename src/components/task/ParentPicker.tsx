import { useState } from 'react';
import { SearchIcon } from 'lucide-react';
import { SheetOption } from './SheetOption';
import { SphereIcon } from '../SphereIcon';
import { useApp } from '../../contexts/AppContext';
import { useSpheres } from '../../hooks/useSpheres';
import { compareOrder } from '../../utils/taskOptions';
import { parentCandidates } from '../../utils/taskTree';
import type { Task } from '../../types';

interface ParentPickerProps {
  task: Task;
  onPick: (parent: Task) => void;
}

/**
 * «Сделать подзадачей…»: все дела с поиском, по сферам. Без самого дела,
 * его подзадач и дел, которые уже подзадачи (больше двух уровней не бывает).
 */
export function ParentPicker({ task, onPick }: ParentPickerProps) {
  const { tasks } = useApp();
  const [query, setQuery] = useState('');
  const { spheres, getSphere } = useSpheres();
  const hasChildren = tasks.some((c) => c.parentId === task.id && c.status !== 'cancelled');

  if (hasChildren) {
    return (
      <p className="py-2 text-[14px] leading-relaxed text-muted">
        У дела есть подзадачи — сначала вынеси их, чтобы не создавать третий уровень.
      </p>);

  }

  const q = query.trim().toLowerCase();
  const candidates = parentCandidates(tasks, task.id).
  filter((p) => !q || p.title.toLowerCase().includes(q)).
  sort(compareOrder);
  const groups = spheres.
  map((s) => ({ sphere: s, items: candidates.filter((p) => getSphere(p.sphere).id === s.id) })).
  filter((g) => g.items.length > 0);

  return (
    <div>
      <label className="mb-2 flex items-center gap-2 rounded-xl border border-line bg-canvas px-3">
        <SearchIcon className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.9} aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Найти дело"
          aria-label="Найти дело"
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent py-2.5 text-[16px] text-ink placeholder:text-muted/80 focus:outline-none" />
        
      </label>
      {groups.length === 0 ?
      <p className="px-1 py-2 text-[14px] text-muted">{q ? 'Ничего не найдено.' : 'Нет подходящих дел.'}</p> :

      <div className="-mx-3 max-h-[52vh] overflow-y-auto">
          {groups.map(({ sphere, items }) =>
        <section key={sphere.id} aria-label={sphere.name}>
              <p className="flex items-center gap-1.5 px-3 pb-1 pt-3 text-[12px] font-medium uppercase tracking-[0.06em] text-muted">
                <SphereIcon id={sphere.id} color={sphere.color} className="h-[13px] w-[13px]" />
                {sphere.name}
              </p>
              {items.map((p) =>
          <SheetOption key={p.id} label={p.title} selected={task.parentId === p.id} onClick={() => onPick(p)} />
          )}
            </section>
        )}
        </div>
      }
    </div>);

}
