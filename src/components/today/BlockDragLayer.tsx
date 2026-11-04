import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { useDragSensors } from '../task/SortableList';
import { SphereIcon } from '../SphereIcon';
import { useSpheres } from '../../hooks/useSpheres';
import { placementFromPoint } from '../../utils/blockPlacement';
import type { BlockSpot, MovableBlock } from '../../utils/blockPlacement';
import { STILL_DISTANCE } from '../../utils/dragDrop';
import { setDragActive } from '../../utils/dragState';

interface BlockDragLayerProps {
  children: React.ReactNode;
  onDrop: (sphere: MovableBlock, spot: BlockSpot) => void;
}

const clientY = (e: Event | null): number | null => {
  if (!e) return null;
  if ('touches' in e) {
    const t = (e as TouchEvent).touches[0] ?? (e as TouchEvent).changedTouches[0];
    return t ? t.clientY : null;
  }
  return 'clientY' in e ? (e as PointerEvent).clientY : null;
};

/**
 * Перенос «Удела»/«Прочего» по расписанию «Сегодня»: долгое нажатие на заголовок блока,
 * линия показывает, между какими элементами он встанет. Цели — промежутки между любыми
 * элементами расписания (намазы, дела, «Завершение дня»); сами намазы не двигаются.
 */
export function BlockDragLayer({ children, onDrop }: BlockDragLayerProps) {
  const sensors = useDragSensors();
  const { getSphere } = useSpheres();
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<MovableBlock | null>(null);
  const [line, setLine] = useState<{y: number;left: number;width: number;} | null>(null);
  const lastY = useRef(0);
  const spot = useRef<BlockSpot | null>(null);
  const activeRef = useRef<MovableBlock | null>(null);

  /** элементы расписания по порядку на экране, без переносимого блока */
  const measure = () => {
    const root = rootRef.current;
    const sphere = activeRef.current;
    if (!root || !sphere) return;
    const own = root.querySelector(`[data-plan-id="list:${sphere}"]`);
    const rects: {id: string;top: number;bottom: number;}[] = [];
    root.querySelectorAll<HTMLElement>('[data-plan-id], [data-row-id]').forEach((el) => {
      if (own && own.contains(el)) return;
      const isRow = el.hasAttribute('data-row-id');
      // дела внутри блоков «Удел»/«Прочее» — не элементы расписания
      if (isRow && el.closest('[data-plan-id^="list:"]')) return;
      const r = el.getBoundingClientRect();
      if (r.height === 0) return;
      rects.push({ id: isRow ? `task:${el.dataset.rowId}` : el.dataset.planId as string, top: r.top, bottom: r.bottom });
    });
    rects.sort((a, b) => a.top - b.top);
    const result = placementFromPoint(rects, lastY.current);
    spot.current = result.spot;
    const box = root.getBoundingClientRect();
    setLine({ y: result.lineY, left: box.left, width: box.width });
  };

  useEffect(() => {
    if (!active) return;
    const onMove = (e: Event) => {
      const y = clientY(e);
      if (y !== null) lastY.current = y;
      measure();
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('scroll', measure, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('scroll', measure);
    };
  }, [active]);

  const reset = () => {
    activeRef.current = null;
    spot.current = null;
    setActive(null);
    setLine(null);
    setDragActive(false);
  };

  const onDragStart = ({ active: a, activatorEvent }: DragStartEvent) => {
    const sphere = String(a.id).replace('block:', '') as MovableBlock;
    activeRef.current = sphere;
    lastY.current = clientY(activatorEvent) ?? 0;
    setActive(sphere);
    setDragActive(true);
    navigator.vibrate?.(8);
    measure();
  };

  const onDragEnd = ({ delta }: DragEndEvent) => {
    const sphere = activeRef.current;
    const target = spot.current;
    reset();
    // отпустили на месте — ничего не меняем
    if (!sphere || !target || Math.abs(delta.x) < STILL_DISTANCE && Math.abs(delta.y) < STILL_DISTANCE) return;
    onDrop(sphere, target);
  };

  const sphere = active ? getSphere(active) : null;

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={reset}>
      <div ref={rootRef}>{children}</div>
      {createPortal(
        <>
          <DragOverlay modifiers={[restrictToVerticalAxis]} dropAnimation={null} zIndex={70}>
            {sphere ?
            <div className="flex scale-[1.02] items-center gap-2 rounded-xl bg-canvas px-3 py-2.5 shadow-[0_10px_24px_rgba(29,33,30,0.16)]">
                <SphereIcon id={sphere.id} color={sphere.color} className="h-[16px] w-[16px] shrink-0" />
                <span className="text-[14px] font-semibold text-ink">{sphere.name}</span>
              </div> :
            null}
          </DragOverlay>
          {line ?
          <span
            aria-hidden="true"
            className="pointer-events-none fixed z-[65] h-[3px] -translate-y-1/2 rounded-full bg-primary"
            style={{ top: line.y, left: line.left, width: line.width }} /> :
          null}
        </>,
        document.body
      )}
    </DndContext>);

}
