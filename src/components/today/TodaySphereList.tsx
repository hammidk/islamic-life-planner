import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useDragControls } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { ChevronDownIcon, GripVerticalIcon } from 'lucide-react';
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
  /** блок сейчас переносится (режим выбора окна) */
  moving?: boolean;
  /** тап по ручке без перетаскивания — режим переноса вкл/выкл */
  onToggleMove?: () => void;
  onDragStart?: () => void;
  /** отпущен после перетаскивания: точка в координатах страницы */
  onDrop?: (point: {x: number;y: number;}) => void;
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
          className="min-w-0 flex-1 truncate text-left text-[14px] font-medium text-ink-soft">

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
 * Ручка: перетаскивание в другое окно или тап — режим переноса с зонами вставки.
 */
export function TodaySphereList({
  sphereId,
  tasks,
  slot,
  moving = false,
  onToggleMove,
  onDragStart,
  onDrop
}: TodaySphereListProps) {
  const navigate = useNavigate();
  const { sections } = useApp();
  const dragControls = useDragControls();
  const draggedRef = useRef(false);
  const [collapsed, toggle] = usePersistentFlag(`ilp.today.collapsed.${sphereId}`, false);
  const sphere = spheres.find((s) => s.id === sphereId) ?? spheres[spheres.length - 1];
  const surface = slot ? RIZQ_SLOT_SURFACE : 'bg-canvas';

  const ownSections = sphereId === 'rizq' ? sections.filter((s) => s.sphere === 'rizq') : [];
  const sectionIds = new Set(ownSections.map((s) => s.id));
  const unsectioned = tasks.filter((t) => !t.sectionId || !sectionIds.has(t.sectionId));
  const draggable = !slot && Boolean(onDrop);

  return (
    <motion.div
      drag={draggable ? 'y' : false}
      dragControls={dragControls}
      dragListener={false}
      dragSnapToOrigin
      dragMomentum={false}
      onDragStart={() => {
        draggedRef.current = true;
        onDragStart?.();
      }}
      onDragEnd={(_: unknown, info: PanInfo) => {
        onDrop?.(info.point);
        window.setTimeout(() => {
          draggedRef.current = false;
        }, 0);
      }}
      whileDrag={{ scale: 1.02, boxShadow: '0 10px 24px rgba(29, 33, 30, 0.14)', zIndex: 30 }}
      className={`relative ${slot ? `-mx-5 px-5 ${RIZQ_SLOT_SURFACE}` : 'bg-canvas'} ${
      moving ? 'rounded-xl ring-2 ring-primary/40' : ''}`
      }>

      <div className="flex items-center gap-1.5 py-2">
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
          <span className={`min-w-0 truncate text-[14px] font-medium ${slot ? 'text-ink' : 'text-muted'}`}>
            {sphere.name}
            {tasks.length > 0 ? <span className="font-normal tabular-nums text-muted"> · {tasks.length}</span> : null}
            {slot ?
            <span className="font-normal tabular-nums text-muted">
                {' '}· {fromMinutes(slot.start)}–{fromMinutes(slot.end)}
              </span> :
            null}
          </span>
        </button>
        {draggable ?
        <button
          type="button"
          aria-label={moving ? `Отменить перенос «${sphere.name}»` : `Перенести «${sphere.name}» в другое окно`}
          aria-pressed={moving}
          onPointerDown={(e) => {
            draggedRef.current = false;
            dragControls.start(e);
          }}
          onClick={() => {
            if (!draggedRef.current) onToggleMove?.();
          }}
          style={{ touchAction: 'none' }}
          className={`flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-lg transition-colors duration-150 ease-out active:cursor-grabbing ${
          moving ? 'bg-primary-tint text-primary' : 'text-muted/70 hover:text-ink-soft'}`
          }>

            <GripVerticalIcon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          </button> :
        null}
      </div>

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
    </motion.div>);

}
