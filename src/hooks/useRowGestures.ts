import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useDrag } from '@use-gesture/react';
import { animate, useMotionValue, useReducedMotion } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import {
  LONG_PRESS_MS,
  LONG_PRESS_TOLERANCE,
  lockAxis,
  resolveOpenSwipe,
  resolveSwipe,
  rubber } from
'../utils/gestures';
import type { Axis } from '../utils/gestures';
import { clickSuppressed, isDragActive } from '../utils/dragState';

/* ---------- одновременно открыта только одна строка ---------- */

let openRow: string | null = null;
const openListeners = new Set<() => void>();

function setOpenRow(id: string | null) {
  if (openRow === id) return;
  openRow = id;
  openListeners.forEach((l) => l());
}

const subscribeOpen = (l: () => void) => {
  openListeners.add(l);
  return () => {
    openListeners.delete(l);
  };
};

/** закрыть открытую строку (например, перед открытием меню) */
export const closeOpenRow = () => setOpenRow(null);

/* ---------- хук ---------- */

interface RowGestureOptions {
  id: string;
  /** ширина кнопок, открываемых свайпом влево */
  actionsWidth: number;
  /** свайп вправо; без него строка вправо только пружинит */
  onIndent?: () => void;
  /** полный свайп влево */
  onDelete: () => void;
  /** удаление спросит подтверждение — строка не улетает, а пружинит назад */
  confirmDelete?: boolean;
  /** долгое нажатие без движения и отпускание */
  onLongPress?: () => void;
  /** жесты выключены (например, строка редактируется) */
  disabled?: boolean;
  /** долгое нажатие обрабатывает перетаскивание (dnd-kit), не хук */
  externalLongPress?: boolean;
}

export interface RowGestures {
  rootRef: React.RefObject<HTMLDivElement>;
  x: MotionValue<number>;
  isOpen: boolean;
  /** палец держится 350 мс — строка «приподнята» */
  lifted: boolean;
  close: () => void;
  /** обработчики для переднего слоя строки */
  bind: () => Record<string, unknown>;
}

const SPRING = { type: 'spring' as const, stiffness: 520, damping: 42 };

/**
 * Единый слой жестов строки: свайп влево открывает кнопки (полный — удаляет),
 * свайп вправо — «сделать подзадачей», долгое нажатие — меню.
 * Горизонталь включается только после 10 px и при |dx| > |dy| × 1.5, иначе
 * жест отдаётся странице (вертикальный скролл).
 */
export function useRowGestures({
  id,
  actionsWidth,
  onIndent,
  onDelete,
  confirmDelete = false,
  onLongPress,
  disabled = false,
  externalLongPress = false
}: RowGestureOptions): RowGestures {
  const rootRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const reduce = useReducedMotion();
  const current = useSyncExternalStore(subscribeOpen, () => openRow, () => null);
  const isOpen = current === id;
  const [lifted, setLifted] = useState(false);

  /** после жеста клик по строке не срабатывает */
  const suppressClick = useRef(false);
  const scrolled = useRef(false);
  const removing = useRef(false);
  const press = useRef<{x: number;y: number;timer: number;} | null>(null);
  const liftedRef = useRef(false);
  const pointerType = useRef('mouse');

  const latest = useRef({ onIndent, onDelete, onLongPress, confirmDelete });
  latest.current = { onIndent, onDelete, onLongPress, confirmDelete };

  const to = useCallback(
    (value: number) => animate(x, value, reduce ? { duration: 0 } : SPRING),
    [x, reduce]
  );

  // другая строка открылась — эта закрывается
  useEffect(() => {
    if (!isOpen && x.get() < 0 && !removing.current) to(0);
  }, [isOpen, x, to]);

  // открытая строка закрывается касанием в любом другом месте
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpenRow(null);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [isOpen]);

  const width = () => rootRef.current?.offsetWidth || 375;

  const cancelPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
    if (liftedRef.current) {
      liftedRef.current = false;
      setLifted(false);
    }
  };

  const dragBind = useDrag(
    ({ event, movement: [mx, my], velocity: [vx], direction: [dirx], last, cancel, canceled, tap, memo }) => {
      if (disabled || tap) return memo;
      if (isDragActive()) {
        if (x.get() !== 0) to(0);
        cancel();
        return memo;
      }
      if ((event.target as HTMLElement | null)?.closest?.('[data-drag-handle]')) {
        cancel();
        return memo;
      }
      const start: number = memo?.start ?? (isOpen ? -actionsWidth : 0);
      let axis: Axis | null = memo?.axis ?? null;

      if (!axis) {
        axis = lockAxis(mx, my);
        if (!axis) return { start, axis: null };
        if (axis === 'y') {
          // вертикаль — это скролл страницы, строка его не трогает
          cancel();
          return { start, axis };
        }
        cancelPress();
        suppressClick.current = true;
        scrolled.current = false;
        if (openRow !== id) setOpenRow(null);
      }
      if (axis === 'y') return { start, axis };

      // страница начала скроллиться — жест отменяется
      if (scrolled.current && !last) {
        cancel();
        return { start, axis };
      }

      const w = width();
      if (!last) {
        // вправо — с сопротивлением (без отступа почти не едет), влево — до ширины строки
        const raw = start + mx;
        x.set(raw > 0 ? rubber(raw, latest.current.onIndent ? 96 : 12) : Math.max(raw, -w));
        return { start, axis };
      }

      if (canceled || scrolled.current) {
        to(start);
        return { start, axis };
      }

      const velocity = vx * dirx;
      const outcome = start < 0 ?
      resolveOpenSwipe(mx, my, velocity, w) :
      resolveSwipe(mx, my, velocity, w);

      if (outcome === 'indent') {
        to(0);
        latest.current.onIndent?.();
      } else if (outcome === 'reveal') {
        setOpenRow(id);
        to(-actionsWidth);
      } else if (outcome === 'delete') {
        setOpenRow(null);
        if (latest.current.confirmDelete) {
          to(0);
          latest.current.onDelete();
        } else if (!removing.current) {
          removing.current = true;
          animate(x, -w, reduce ? { duration: 0 } : { duration: 0.2, ease: [0.23, 1, 0.32, 1] }).then(() => {
            latest.current.onDelete();
            removing.current = false;
            x.set(0);
          });
        }
      } else if (outcome === 'close') {
        setOpenRow(null);
        to(0);
      } else {
        to(start);
      }
      return { start, axis };
    },
    // без захвата указателя: перетаскивание dnd-kit на той же строке получает свои события
    { filterTaps: true, enabled: !disabled, pointer: { capture: false } }
  );

  // жест отменяется, если начал скроллиться родитель
  useEffect(() => {
    const onScroll = () => {
      scrolled.current = true;
      cancelPress();
    };
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', onScroll, true);
  }, []);

  const close = useCallback(() => {
    if (openRow === id) setOpenRow(null);
    to(0);
  }, [id, to]);

  const bind = () => {
    const handlers = dragBind() as Record<string, ((e: React.SyntheticEvent) => void) | undefined>;
    const chain = (name: string, own: (e: never) => void) => (e: React.SyntheticEvent) => {
      handlers[name]?.(e);
      own(e as never);
    };
    return {
      ...handlers,
      onPointerDown: chain('onPointerDown', (e: React.PointerEvent) => {
        suppressClick.current = false;
        scrolled.current = false;
        pointerType.current = e.pointerType;
        if (disabled || externalLongPress || e.button !== 0) return;
        if ((e.target as HTMLElement).closest('input, textarea, [data-drag-handle]')) return;
        cancelPress();
        press.current = {
          x: e.clientX,
          y: e.clientY,
          timer: window.setTimeout(() => {
            liftedRef.current = true;
            setLifted(true);
            suppressClick.current = true;
            navigator.vibrate?.(8);
          }, LONG_PRESS_MS)
        };
      }),
      onPointerMove: chain('onPointerMove', (e: React.PointerEvent) => {
        const p = press.current;
        if (!p) return;
        if (Math.abs(e.clientX - p.x) > LONG_PRESS_TOLERANCE || Math.abs(e.clientY - p.y) > LONG_PRESS_TOLERANCE) {
          cancelPress();
        }
      }),
      onPointerUp: chain('onPointerUp', () => {
        const wasLifted = liftedRef.current;
        cancelPress();
        if (wasLifted) {
          setOpenRow(null);
          latest.current.onLongPress?.();
        }
      }),
      onPointerCancel: chain('onPointerCancel', () => cancelPress()),
      onClickCapture: (e: React.MouseEvent) => {
        if (suppressClick.current || clickSuppressed()) {
          e.preventDefault();
          e.stopPropagation();
          suppressClick.current = false;
          return;
        }
        // тап по открытой строке закрывает её, а не открывает дело
        if (openRow === id) {
          e.preventDefault();
          e.stopPropagation();
          close();
        }
      },
      onContextMenu: (e: React.MouseEvent) => {
        e.preventDefault();
        // правая кнопка мыши — то же меню; на телефонах меню открывает долгое нажатие
        if (pointerType.current === 'mouse' && !liftedRef.current) {
          cancelPress();
          latest.current.onLongPress?.();
        }
      },
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'ContextMenu' || e.shiftKey && e.key === 'F10') {
          e.preventDefault();
          latest.current.onLongPress?.();
        }
      }
    };
  };

  return { rootRef, x, isOpen, lifted, close, bind };
}
