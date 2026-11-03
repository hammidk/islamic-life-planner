import type React from 'react';

/**
 * Enter (Return / «Готово» на клавиатуре iPhone), который должен создать дело или пункт:
 * без Shift и не во время набора через IME (isComposing, keyCode 229).
 */
export function isSubmitEnter(e: React.KeyboardEvent): boolean {
  return e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229;
}
