import { useEffect, useRef } from 'react';

interface SheetEntry {
  id: number;
  close: () => void;
}

/** Модульный стек открытых листов: жест «назад» закрывает только верхний */
const stack: SheetEntry[] = [];
let sequence = 0;
let ignorePops = 0;
let pendingBacks = 0;
let flushScheduled = false;
let listening = false;

function onPopState() {
  if (ignorePops > 0) {
    ignorePops -= 1;
    return;
  }
  const top = stack.pop();
  if (top) top.close();
}

function ensureListener() {
  if (listening || typeof window === 'undefined') return;
  window.addEventListener('popstate', onPopState);
  listening = true;
}

const currentHasSheetEntry = (): boolean => {
  try {
    const state: unknown = window.history.state;
    return Boolean(
      state && typeof state === 'object' && (state as Record<string, unknown>).__sheetId !== undefined
    );
  } catch {
    return false;
  }
};

/** Снимает записи закрытых листов одним шагом назад (несколько листов могли закрыться разом) */
function scheduleFlush() {
  if (flushScheduled) return;
  flushScheduled = true;
  window.setTimeout(() => {
    flushScheduled = false;
    const count = pendingBacks;
    pendingBacks = 0;
    // после закрытия был переход на другой экран — записи листов уже не наверху, не трогаем
    if (count <= 0 || !currentHasSheetEntry()) return;
    ignorePops += 1;
    try {
      window.history.go(-count);
    } catch {
      ignorePops -= 1;
    }
  }, 0);
}

/**
 * Пока лист открыт, в истории есть его запись: «назад» закрывает лист, экран под ним не меняется.
 * Если лист закрыт кнопкой, фоном или свайпом, его запись убирается, чтобы история не копилась.
 * rearmKey — смена значения при открытом листе заново ставит запись (например, после «Отмена»).
 */
export function useSheetBackGuard(open: boolean, onClose: () => void, rearmKey?: number): void {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    ensureListener();
    sequence += 1;
    const id = sequence;
    const entry: SheetEntry = { id, close: () => closeRef.current() };
    stack.push(entry);
    try {
      // состояние роутера сохраняем — оно принадлежит react-router
      const prev: unknown = window.history.state;
      const base = prev && typeof prev === 'object' ? prev as Record<string, unknown> : {};
      window.history.pushState({ ...base, __sheetId: id }, '');
    } catch {

      /* история недоступна — лист просто закрывается кнопками */}

    return () => {
      const index = stack.indexOf(entry);
      // лист уже закрыт жестом «назад» — его запись снята браузером
      if (index === -1) return;
      stack.splice(index, 1);
      pendingBacks += 1;
      scheduleFlush();
    };
  }, [open, rearmKey]);
}