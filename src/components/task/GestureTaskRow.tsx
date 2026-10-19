import React, { useRef } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { Trash2Icon } from 'lucide-react';

interface GestureTaskRowProps {
  /** непрозрачный фон строки — закрывает красный слой удаления */
  surface: string;
  label: string;
  onLongPress: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}

const LONG_PRESS_MS = 480;
const MOVE_TOLERANCE = 8;
const DELETE_DISTANCE = 110;
const DELETE_VELOCITY = -600;

/** Свайп справа налево — удаление, долгое нажатие — меню действий */
export function GestureTaskRow({
  surface,
  label,
  onLongPress,
  onDelete,
  children
}: GestureTaskRowProps) {
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-DELETE_DISTANCE, -16, 0], [1, 0.5, 0]);
  const iconScale = useTransform(x, [-DELETE_DISTANCE, -40], [1, 0.8]);

  const timer = useRef<number | undefined>(undefined);
  const origin = useRef<{x: number;y: number;} | null>(null);
  const suppressClick = useRef(false);
  const removing = useRef(false);

  const clearTimer = () => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    suppressClick.current = false;
    if ((e.target as HTMLElement).closest('[data-drag-handle]')) return;
    origin.current = { x: e.clientX, y: e.clientY };
    clearTimer();
    timer.current = window.setTimeout(() => {
      suppressClick.current = true;
      navigator.vibrate?.(8);
      onLongPress();
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!origin.current || timer.current === undefined) return;
    const dx = Math.abs(e.clientX - origin.current.x);
    const dy = Math.abs(e.clientY - origin.current.y);
    if (dx > MOVE_TOLERANCE || dy > MOVE_TOLERANCE) clearTimer();
  };

  const onPointerEnd = () => {
    clearTimer();
    origin.current = null;
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const shouldDelete = info.offset.x < -DELETE_DISTANCE || info.velocity.x < DELETE_VELOCITY;
    if (shouldDelete && !removing.current) {
      removing.current = true;
      animate(x, -480, { duration: 0.2, ease: [0.23, 1, 0.32, 1] }).then(onDelete);
    } else {
      animate(x, 0, { type: 'spring', stiffness: 520, damping: 42 });
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      <motion.div
        style={{ opacity: deleteOpacity }}
        className="absolute inset-0 flex items-center justify-end rounded-xl bg-[#B0553F] pr-5 text-white"
        aria-hidden="true">
        
        <motion.span style={{ scale: iconScale }} className="flex items-center gap-1.5 text-[13px] font-medium">
          <Trash2Icon className="h-4 w-4" strokeWidth={2} />
          Удалить
        </motion.span>
      </motion.div>

      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ right: 0 }}
        dragElastic={{ right: 0.04, left: 1 }}
        dragMomentum={false}
        onDragStart={() => {
          clearTimer();
          suppressClick.current = true;
        }}
        onDragEnd={onDragEnd}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onPointerLeave={onPointerEnd}
        onClickCapture={(e) => {
          if (suppressClick.current) {
            e.preventDefault();
            e.stopPropagation();
            suppressClick.current = false;
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          // доступ к меню с клавиатуры
          if (e.key === 'ContextMenu' || e.shiftKey && e.key === 'F10') {
            e.preventDefault();
            onLongPress();
          }
        }}
        aria-label={label}
        style={{ x, touchAction: 'pan-y', WebkitTouchCallout: 'none' }}
        className={`relative select-none ${surface}`}>
        
        {children}
      </motion.div>
    </div>);

}