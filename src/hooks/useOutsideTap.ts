import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

/**
 * Тап вне элемента. Окна и меню карточки (листы, «Дата и время», всплывающие меню)
 * открываются поверх в портале — тапы в них не считаются «вне».
 */
export function useOutsideTap(ref: RefObject<HTMLElement>, active: boolean, onOutside: () => void): void {
  const handlerRef = useRef(onOutside);
  handlerRef.current = onOutside;

  useEffect(() => {
    if (!active) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target || ref.current?.contains(target)) return;
      if (target.closest('[role="dialog"], [data-composer-popup]')) return;
      handlerRef.current();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [active, ref]);
}
