import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDraggable } from '@dnd-kit/core';
import { ChevronDownIcon, MoreHorizontalIcon } from 'lucide-react';
import { PopoverMenu } from '../ui/PopoverMenu';
import { clickSuppressed } from '../../utils/dragState';
import { DayTaskList } from '../DayTaskList';
import { SphereIcon } from '../SphereIcon';
import { useApp } from '../../contexts/AppContext';
import { spheres } from '../../data/appData';
import { fromMinutes } from '../../utils/prayer';
import { usePersistentFlag } from '../../utils/localPrefs';
import type { Task } from '../../types';

/** фон «Удела» в расписании: цвет сферы (#6E6AA6) с прозрачностью 12% поверх canvas, непрозрачный */
export const RIZQ_SLOT_SURFACE = 'bg-[#E5E5EB]';

interface TodaySphereListProps {
  sphereId: 'rizq' | 'other';
  /** открытые дела без времени на сегодня или без даты */
  tasks: Task[];
  /** «Удел» со временем в расписании — стоит на своём месте, без ручки */
  slot?: {start: number;end: number;};
  /** блок можно переносить: долгое нажатие на заголовок и меню «⋯» */
  movable?: boolean;
  /** пункты меню «⋯»: undefined — пункта нет */
  onUp?: () => void;
  onDown?: () => void;
  /** «Вернуть на место» — только если блок перенесён сегодня */
  onReset?: () => void;
}

function NestedSection({
  sectionId,
  title,
  tasks,
  surface





}: {sectionId: string;title: string;tasks: Task[];surface: string;}) {
  const navigate = useNavigate();
  const [collapsed, toggle] = usePersistentFlag(`ilp.today.collapsed.section.${sectionId}`, false);
  return (
    <div>
      <div className="flex items-center gap-1.5 py-2">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? `Развернуть «${title}»` : `Свернуть «${title}»`}
          className="-ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-150 ease-out hover:bg-line/60">

          <ChevronDownIcon
            className={`h-4 w-4 transition-transform duration-200 ease-out ${collapsed ? '-rotate-90' : ''}`}
            strokeWidth={2}
            aria-hidden="true" />

        </button>
        <button
          type="button"
          onClick={() => navigate(`/sphere/rizq/section/${sectionId}`)}
          className="min-w-0 flex-1 truncate text-left text-[14px] font-semibold text-ink">

          {title}
          <span className="font-normal tabular-nums text-muted"> · {tasks.length}</span>
        </button>
      </div>
      {!collapsed && tasks.length > 0 ?
      <div className="pl-[22px]">
          <DayTaskList tasks={tasks} divider="divide-line" surface={surface} showDate={false} hideDone />
        </div> :
      null}
    </div>);

}

/**
 * «Удел» или «Прочее» на «Сегодня»: сворачивается по шеврону (состояние запоминается),
 * заголовок ведёт на страницу сферы. У «Удела» внутри: дела без раздела, затем разделы.
 * Перенос: долгое нажатие на заголовок и перетаскивание или меню «⋯» (Поднять / Опустить /
 * Вернуть на место). Положение действует только сегодня.
 */
export function TodaySphereList({
  sphereId,
  tasks,
  slot,
  movable = false,
  onUp,
  onDown,
  onReset
}: TodaySphereListProps) {
  const navigate = useNavigate();
  const { sections } = useApp();
  const [collapsed, toggle] = usePersistentFlag(`ilp.today.collapsed.${sphereId}`, false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const sphere = spheres.find((s) => s.id === sphereId) ?? spheres[spheres.length - 1];
  const surface = slot ? RIZQ_SLOT_SURFACE : 'bg-canvas';
  const draggable = movable && !slot;
  const { setNodeRef, setActivatorNodeRef, listeners, isDragging } = useDraggable({
    id: `block:${sphereId}`,
    disabled: !draggable
  });

  const ownSections = sphereId === 'rizq' ? sections.filter((s) => s.sphere === 'rizq') : [];
  const sectionIds = new Set(ownSections.map((s) => s.id));
  const unsectioned = tasks.filter((t) => !t.sectionId || !sectionIds.has(t.sectionId));

  const menuItems = [
  ...(onUp ? [{ key: 'up', label: 'Поднять' }] : []),
  ...(onDown ? [{ key: 'down', label: 'Опустить' }] : []),
  ...(onReset ? [{ key: 'reset', label: 'Вернуть на место' }] : [])];


  return (
    <div
      ref={setNodeRef}
      data-plan-id={`list:${sphereId}`}
      className={`relative transition-opacity duration-150 ${slot ? `-mx-5 px-5 ${RIZQ_SLOT_SURFACE}` : 'bg-canvas'} ${
      isDragging ? 'opacity-40' : ''}`
      }>

      <div
        ref={draggable ? setActivatorNodeRef : undefined}
        {...(draggable ? listeners : {})}
        onClickCapture={(e) => {
          // после перетаскивания тап по заголовку не срабатывает
          if (clickSuppressed()) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onContextMenu={(e) => draggable && e.preventDefault()}
        className={`flex items-center gap-1.5 py-2 ${draggable ? 'row-gesture' : ''}`}>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? `Развернуть «${sphere.name}»` : `Свернуть «${sphere.name}»`}
          className="-ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-150 ease-out hover:bg-line/60">

          <ChevronDownIcon
            className={`h-4 w-4 transition-transform duration-200 ease-out ${collapsed ? '-rotate-90' : ''}`}
            strokeWidth={2}
            aria-hidden="true" />

        </button>
        <button
          type="button"
          onClick={() => navigate(`/sphere/${sphere.id}`)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left">

          <SphereIcon id={sphere.id} color={sphere.color} className="h-[16px] w-[16px] shrink-0" />
          <span className="min-w-0 truncate text-[14px] font-semibold text-ink">
            {sphere.name}
            {tasks.length > 0 ? <span className="font-normal tabular-nums text-muted"> · {tasks.length}</span> : null}
            {slot ?
            <span className="font-normal tabular-nums text-muted">
                {' '}· {fromMinutes(slot.start)}–{fromMinutes(slot.end)}
              </span> :
            null}
          </span>
        </button>
        {draggable && menuItems.length > 0 ?
        <button
          ref={menuRef}
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label={`Переместить «${sphere.name}»`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-150 ease-out hover:bg-line/60 hover:text-ink-soft">

            <MoreHorizontalIcon className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
          </button> :
        null}
      </div>

      <PopoverMenu
        open={menuOpen}
        anchor={menuRef.current}
        items={menuItems}
        label={`Переместить «${sphere.name}»`}
        onClose={() => setMenuOpen(false)}
        onSelect={(key) => {
          setMenuOpen(false);
          if (key === 'up') onUp?.();else
          if (key === 'down') onDown?.();else
          onReset?.();
        }} />

      {!collapsed ?
      <div className="pb-1 pl-[26px]">
          {unsectioned.length > 0 ?
        <DayTaskList tasks={unsectioned} divider="divide-line" surface={surface} showDate={false} hideDone /> :
        null}
          {ownSections.map((section) =>
        <NestedSection
          key={section.id}
          sectionId={section.id}
          title={section.title}
          tasks={tasks.filter((t) => t.sectionId === section.id)}
          surface={surface} />

        )}
        </div> :
      null}
    </div>);

}
