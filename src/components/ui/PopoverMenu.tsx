import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckIcon } from 'lucide-react';
import { useSheetBackGuard } from '../../hooks/useSheetBackGuard';

export interface PopoverItem {
  key: string;
  label: string;
  /** серая подсказка справа, например дата */
  hint?: string;
  selected?: boolean;
}

interface PopoverMenuProps {
  open: boolean;
  /** элемент, под (или над) которым показывается меню */
  anchor: HTMLElement | null;
  items: PopoverItem[];
  onSelect: (key: string) => void;
  onClose: () => void;
  label: string;
}

const WIDTH = 264;
const MARGIN = 12;
const ROW = 44;

/** Компактное всплывающее меню как в iOS: скруглённый список с отметкой выбранного пункта */
export function PopoverMenu({ open, anchor, items, onSelect, onClose, label }: PopoverMenuProps) {
  useSheetBackGuard(open, onClose);
  const [pos, setPos] = useState<{top: number;left: number;origin: string;} | null>(null);

  useEffect(() => {
    if (!open || !anchor) return;
    const r = anchor.getBoundingClientRect();
    const height = items.length * ROW + 8;
    const below = r.bottom + 6 + height <= window.innerHeight - MARGIN;
    const top = below ? r.bottom + 6 : Math.max(MARGIN, r.top - 6 - height);
    const left = Math.min(Math.max(MARGIN, r.left), window.innerWidth - Math.min(WIDTH, window.innerWidth - 2 * MARGIN) - MARGIN);
    setPos({ top, left, origin: below ? 'top left' : 'bottom left' });
  }, [open, anchor, items.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && pos ?
      <div key="popover" className="fixed inset-0 z-[80]" data-composer-popup>
          <button type="button" aria-label="Закрыть" onClick={onClose} className="absolute inset-0 cursor-default" />
          <motion.div
          role="menu"
          aria-label={label}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
          style={{ top: pos.top, left: pos.left, transformOrigin: pos.origin, width: `min(${WIDTH}px, calc(100vw - ${2 * MARGIN}px))` }}
          className="absolute overflow-hidden rounded-[14px] bg-surface/95 py-1 shadow-[0_12px_36px_rgba(29,33,30,0.2)] backdrop-blur">
          
            {items.map((item, index) =>
          <React.Fragment key={item.key}>
                {index > 0 ? <span className="ml-10 block border-t border-line" aria-hidden="true" /> : null}
                <button
              type="button"
              role="menuitemradio"
              aria-checked={Boolean(item.selected)}
              onClick={() => onSelect(item.key)}
              className="flex h-11 w-full items-center gap-2 pl-3 pr-4 text-left transition-colors duration-100 ease-out hover:bg-canvas active:bg-canvas">
              
                  <span className="flex w-5 shrink-0 justify-center text-ink">
                    {item.selected ? <CheckIcon className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" /> : null}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[16px] text-ink">{item.label}</span>
                  {item.hint ? <span className="shrink-0 text-[14px] text-muted">{item.hint}</span> : null}
                </button>
              </React.Fragment>
          )}
          </motion.div>
        </div> :
      null}
    </AnimatePresence>,
    document.body
  );
}
