import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors } from
'@dnd-kit/core';
import type { DragEndEvent, DragMoveEvent, DragStartEvent, PointerSensorOptions } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { LONG_PRESS_MS, LONG_PRESS_TOLERANCE } from '../../utils/gestures';
import { NEST_OFFSET, arrayMove, dropLineSide, resolveDrop } from '../../utils/dragDrop';
import { setDragActive } from '../../utils/dragState';

/** Мышь и перо: тянуть по вертикали от 6 px. Пальцы обрабатывает TouchSensor с задержкой. */
class MousePointerSensor extends PointerSensor {
  static activators = [
  {
    eventName: 'onPointerDown' as const,
    handler: ({ nativeEvent }: React.PointerEvent, { onActivation }: PointerSensorOptions) => {
      if (nativeEvent.pointerType === 'touch' || !nativeEvent.isPrimary || nativeEvent.button !== 0) return false;
      if ((nativeEvent.target as HTMLElement).closest('input, textarea')) return false;
      onActivation?.({ event: nativeEvent });
      return true;
    }
  }];

}

/** Датчики перетаскивания приложения: палец — долгое нажатие, мышь — по вертикали */
export function useDragSensors() {
  return useSensors(
    useSensor(TouchSensor, { activationConstraint: { delay: LONG_PRESS_MS, tolerance: LONG_PRESS_TOLERANCE } }),
    useSensor(MousePointerSensor, { activationConstraint: { distance: { y: 6 }, tolerance: { x: 6 } } })
  );
}

export interface DragRowState {
  /** обработчики dnd-kit — на передний слой строки */
  dragListeners: Record<string, (e: React.SyntheticEvent) => void> | undefined;
  /** строка сейчас в руке (на месте остаётся бледная копия) */
  isDragging: boolean;
  /** линия места вставки */
  dropLine: 'before' | 'after' | null;
  /** строка станет родителем перетаскиваемой */
  nestTarget: boolean;
}

interface SortableListProps<T> {
  items: T[];
  getId: (item: T) => string;
  onReorder: (ids: string[]) => void;
  renderItem: (item: T, drag: DragRowState) => React.ReactNode;
  /** копия строки в руке */
  renderOverlay: (item: T) => React.ReactNode;
  /** отпустили без движения — меню действий */
  onMenu: (item: T) => void;
  /** сдвиг вправо > 40 px над строкой: можно ли вложить */
  canNest?: (item: T, parent: T) => boolean;
  onNest?: (item: T, parent: T) => void;
  className?: string;
}

function SortableRow({
  id,
  index,
  activeIndex,
  overIndex,
  nestIndex,
  children





}: {id: string;index: number;activeIndex: number;overIndex: number;nestIndex: number;children: (drag: DragRowState) => React.ReactNode;}) {
  const { setNodeRef, listeners, isDragging } = useSortable({ id });
  const dropLine = nestIndex === -1 && overIndex === index ? dropLineSide(activeIndex, overIndex) : null;
  return (
    <div ref={setNodeRef} className="relative">
      {dropLine ?
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 z-10 h-[3px] rounded-full bg-primary ${
        dropLine === 'before' ? '-top-[2px]' : '-bottom-[2px]'}`
        } /> :
      null}
      {children({
        dragListeners: listeners as DragRowState['dragListeners'],
        isDragging,
        dropLine,
        nestTarget: nestIndex === index
      })}
    </div>);

}

/**
 * Перестановка на dnd-kit: палец — долгое нажатие 350 мс (сдвиг до 8 px), мышь — от 6 px
 * по вертикали. Копия строки ходит только по вертикали, у краёв экрана — автоскролл.
 * Строка, отпущенная на месте, открывает меню.
 */
export function SortableList<T>({
  items,
  getId,
  onReorder,
  renderItem,
  renderOverlay,
  onMenu,
  canNest,
  onNest,
  className
}: SortableListProps<T>) {
  const sensors = useDragSensors();
  const ids = items.map(getId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [nestId, setNestId] = useState<string | null>(null);
  const activeIndex = activeId ? ids.indexOf(activeId) : -1;
  const overIndex = overId ? ids.indexOf(overId) : -1;
  const nestIndex = nestId ? ids.indexOf(nestId) : -1;

  const nestable = (dx: number, over: string | null) => {
    if (!canNest || !activeId || !over || over === activeId || dx <= NEST_OFFSET) return null;
    const item = items[ids.indexOf(activeId)];
    const parent = items[ids.indexOf(over)];
    return item && parent && canNest(item, parent) ? over : null;
  };

  const reset = () => {
    setActiveId(null);
    setOverId(null);
    setNestId(null);
    setDragActive(false);
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    setDragActive(true);
    setActiveId(String(active.id));
    setOverId(String(active.id));
    navigator.vibrate?.(8);
  };

  const onDragMove = ({ delta, over }: DragMoveEvent) => {
    const o = over ? String(over.id) : null;
    setOverId(o);
    setNestId(nestable(delta.x, o));
  };

  const onDragEnd = ({ active, over, delta }: DragEndEvent) => {
    const from = ids.indexOf(String(active.id));
    const to = over ? ids.indexOf(String(over.id)) : -1;
    const intent = resolveDrop(from, to, delta.x, delta.y, (i) => nestable(delta.x, ids[i]) !== null);
    reset();
    if (intent.kind === 'menu') onMenu(items[from]);else
    if (intent.kind === 'reorder') onReorder(arrayMove(ids, intent.from, intent.to));else
    if (intent.kind === 'nest') onNest?.(items[from], items[intent.parentIndex]);
  };

  const active = activeIndex >= 0 ? items[activeIndex] : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onDragCancel={reset}>
      
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {items.map((item, index) =>
          <SortableRow
            key={getId(item)}
            id={getId(item)}
            index={index}
            activeIndex={activeIndex}
            overIndex={overIndex}
            nestIndex={nestIndex}>
            
              {(drag) => renderItem(item, drag)}
            </SortableRow>
          )}
        </div>
      </SortableContext>
      {createPortal(
        <DragOverlay modifiers={[restrictToVerticalAxis]} dropAnimation={null} zIndex={70}>
          {active ?
          <div className="scale-[1.02] rounded-xl shadow-[0_10px_24px_rgba(29,33,30,0.16)]">{renderOverlay(active)}</div> :
          null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>);

}
