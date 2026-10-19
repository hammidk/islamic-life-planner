import React from 'react';
import { GripVerticalIcon } from 'lucide-react';
import type { DragControls } from 'framer-motion';

interface DragHandleProps {
  controls: DragControls;
  label: string;
}

/** Зажать и тянуть вверх/вниз — меняет порядок */
export function DragHandle({ controls, label }: DragHandleProps) {
  return (
    <button
      type="button"
      data-drag-handle
      aria-label={`Перетащить «${label}»`}
      onPointerDown={(e) => {
        e.preventDefault();
        controls.start(e);
      }}
      style={{ touchAction: 'none' }}
      className="-mr-1 flex h-8 w-7 shrink-0 cursor-grab items-center justify-center rounded-lg text-muted/70 transition-colors duration-150 ease-out hover:text-ink-soft active:cursor-grabbing">
      
      <GripVerticalIcon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
    </button>);

}