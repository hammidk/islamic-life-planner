import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronRightIcon, ClockIcon, FolderPlusIcon, PlusIcon } from 'lucide-react';
import { Shell, SubHeader } from '../components/Shell';
import { BottomSheet } from '../components/BottomSheet';
import { SheetOption } from '../components/task/SheetOption';
import { SectionBlock } from '../components/sphere/SectionBlock';
import { SlotSheet } from '../components/sphere/SlotSheet';
import { useApp } from '../contexts/AppContext';
import { useInlineCreateHost, useQuickAdd } from '../contexts/QuickAddContext';
import { InlineCreate } from '../components/task/InlineCreate';
import { spheres } from '../data/appData';
import { compareOrder } from '../utils/taskOptions';
import { formatDuration } from '../utils/prayer';
import type { SphereId, Task } from '../types';

export function SphereDetail() {
  const { id } = useParams();
  const { tasks, goals, sections, addSection, addTask, updateTask, sphereSlots, setSphereSlot } = useApp();
  const { openQuickAdd } = useQuickAdd();
  useInlineCreateHost(id ? { sphere: id as SphereId } : {});

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [newSection, setNewSection] = useState<string | null>(null);
  const [moving, setMoving] = useState<Task | null>(null);
  const [slotOpen, setSlotOpen] = useState(false);

  const sphere = spheres.find((s) => s.id === id);

  if (!sphere) {
    return (
      <Shell>
        <SubHeader title="Сфера не найдена" />
      </Shell>);

  }

  const sphereTasks = tasks.
  filter((t) => t.sphere === sphere.id && t.status !== 'cancelled').
  sort(
    (a, b) =>
    compareOrder(a, b) ||
    ((a.date ?? '') + (a.time ?? '99')).localeCompare((b.date ?? '') + (b.time ?? '99'))
  );
  const taskIds = new Set(sphereTasks.map((t) => t.id));
  /** Сфера → Раздел → Задача → Подзадача: подзадачи показываются под родителем */
  const topLevel = sphereTasks.filter((t) => !t.parentId || !taskIds.has(t.parentId));
  const subtasksOf = (parentId: string) => sphereTasks.filter((t) => t.parentId === parentId);
  const sphereGoals = goals.filter((g) => g.sphere === sphere.id);

  /** «Прочее» — плоский список без разделов */
  const isOther = sphere.id === 'other';
  const sphereSections = isOther ? [] : sections.filter((s) => s.sphere === sphere.id);
  const sectionIds = new Set(sphereSections.map((s) => s.id));
  const unsectioned = topLevel.filter((t) => !t.sectionId || !sectionIds.has(t.sectionId));
  const onMove = sphereSections.length > 0 ? setMoving : null;

  const quickAdd = (title: string, sectionId?: string) =>
  addTask({ title, sphere: sphere.id, sectionId });

  const createSection = () => {
    const title = newSection?.trim();
    if (title) addSection(sphere.id, title);
    setNewSection(null);
  };

  return (
    <Shell nav>
      <SubHeader
        title={sphere.name}
        subtitle={
        isOther ?
        `${sphereTasks.length} дел` :
        `${sphereTasks.length} дел · ${sphereSections.length} разделов`
        } />
      

      <InlineCreate />

      {sphere.id === 'rizq' ?
      <>
          <button
          type="button"
          onClick={() => setSlotOpen(true)}
          className="mb-5 flex w-full items-center gap-3 rounded-card border border-line bg-surface px-4 py-3.5 text-left shadow-card transition-colors duration-150 ease-out hover:border-primary/40">
          
            <ClockIcon className="h-[17px] w-[17px] shrink-0" style={{ color: sphere.color }} strokeWidth={1.9} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-[15px] text-ink">Время в расписании</span>
            <span className="shrink-0 whitespace-nowrap text-[13.5px] tabular-nums text-muted">
              {sphereSlots.rizq ?
            `${sphereSlots.rizq.start} · ${formatDuration(sphereSlots.rizq.duration)}` :
            'Не задано'}
            </span>
            <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.8} aria-hidden="true" />
          </button>
          <SlotSheet
          open={slotOpen}
          slot={sphereSlots.rizq}
          onSave={(slot) => setSphereSlot('rizq', slot)}
          onClose={() => setSlotOpen(false)} />
        
        </> :
      null}

      {sphereGoals.length > 0 ?
      <div className="mb-6 divide-y divide-line rounded-card border border-line bg-surface shadow-card">
          {sphereGoals.map((goal) =>
        <div key={goal.id} className="px-4 py-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-[15px] text-ink">{goal.title}</p>
                <span className="shrink-0 text-[12.5px] tabular-nums text-muted">
                  {goal.progress}%
                </span>
              </div>
              <span className="mt-2 block h-[4px] w-full overflow-hidden rounded-full bg-canvas">
                <span
              className="block h-full rounded-full"
              style={{ width: `${goal.progress}%`, backgroundColor: sphere.color }} />
            
              </span>
            </div>
        )}
        </div> :
      null}

      {isOther ? null : newSection === null ?
      <button
        type="button"
        onClick={() => setNewSection('')}
        className="mb-4 flex items-center gap-1.5 px-1 text-[13.5px] font-medium text-primary">
        
          <FolderPlusIcon className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
          Новый раздел
        </button> :

      <div className="mb-4 flex items-center gap-2 rounded-card border border-primary/40 bg-surface px-4 py-2.5 shadow-card">
          <input
          autoFocus
          value={newSection}
          onChange={(e) => setNewSection(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') createSection();
            if (e.key === 'Escape') setNewSection(null);
          }}
          placeholder="Название раздела, например «Ремонт»"
          aria-label="Название раздела"
          className="min-w-0 flex-1 bg-transparent text-[16px] text-ink placeholder:text-muted/80 focus:outline-none" />
        
          <button
          type="button"
          onClick={() => setNewSection(null)}
          className="shrink-0 px-1 text-[13.5px] text-muted">
          
            Отмена
          </button>
          <button
          type="button"
          onClick={createSection}
          disabled={!newSection.trim()}
          className="shrink-0 rounded-full bg-primary px-3.5 py-1.5 text-[13.5px] font-medium text-white disabled:opacity-40">
          
            Создать
          </button>
        </div>
      }

      <div className="space-y-6">
        {unsectioned.length > 0 || sphereSections.length === 0 ?
        <SectionBlock
          tasks={unsectioned}
          subtasksOf={subtasksOf}
          onMove={onMove}
          onAdd={(title) => quickAdd(title)} /> :

        null}

        {sphereSections.map((section) =>
        <SectionBlock
          key={section.id}
          title={section.title}
          collapsed={Boolean(collapsed[section.id])}
          onToggle={() =>
          setCollapsed((prev) => ({ ...prev, [section.id]: !prev[section.id] }))
          }
          tasks={topLevel.filter((t) => t.sectionId === section.id)}
          subtasksOf={subtasksOf}
          onMove={onMove}
          onAdd={(title) => quickAdd(title, section.id)} />

        )}
      </div>

      <button
        type="button"
        onClick={() => openQuickAdd({ sphere: sphere.id })}
        className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-card border border-dashed border-line py-3.5 text-[13.5px] text-muted transition-colors duration-150 ease-out hover:border-primary/40 hover:text-primary">
        
        <PlusIcon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        Добавить дело подробно
      </button>

      <BottomSheet
        open={moving !== null}
        title="Переместить в раздел"
        onClose={() => setMoving(null)}>
        
        <div className="-mx-3">
          <SheetOption
            label="Без раздела"
            selected={Boolean(moving) && !sectionIds.has(moving?.sectionId ?? '')}
            onClick={() => {
              if (moving) updateTask(moving.id, { sectionId: undefined });
              setMoving(null);
            }} />
          
          {sphereSections.map((section) =>
          <SheetOption
            key={section.id}
            label={section.title}
            selected={moving?.sectionId === section.id}
            onClick={() => {
              if (moving) updateTask(moving.id, { sectionId: section.id });
              setMoving(null);
            }} />

          )}
        </div>
      </BottomSheet>
    </Shell>);

}