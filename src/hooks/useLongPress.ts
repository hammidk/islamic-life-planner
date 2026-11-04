import React, { useRef } from 'react';
import { LONG_PRESS_MS, LONG_PRESS_TOLERANCE } from '../utils/gestures';

/**
 * Долгое нажатие 350 мс без движения (или правая кнопка мыши) — действие; обычный тап
 * после долгого нажатия не срабатывает. Скролл пальцем отменяет нажатие.
 */
export function useLongPress(onLongPress: () => void) {
  const timer = useRef<number | undefined>(undefined);
  const origin = useRef<{x: number;y: number;} | null>(null);
  const fired = useRef(false);

  const cancel = () => {
    window.clearTimeout(timer.current);
    origin.current = null;
  };

  return {
    onPointerDown: (e: React.PointerEvent) => {
      fired.current = false;
      if (e.button > 0) return;
      origin.current = { x: e.clientX, y: e.clientY };
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        fired.current = true;
        navigator.vibrate?.(8);
        onLongPress();
      }, LONG_PRESS_MS);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const o = origin.current;
      if (o && (Math.abs(e.clientX - o.x) > LONG_PRESS_TOLERANCE || Math.abs(e.clientY - o.y) > LONG_PRESS_TOLERANCE)) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onClickCapture: (e: React.MouseEvent) => {
      if (fired.current) {
        e.preventDefault();
        e.stopPropagation();
        fired.current = false;
      }
    },
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      if (!fired.current) {
        cancel();
        onLongPress();
      }
    }
  };
}
