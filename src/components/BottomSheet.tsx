import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { XIcon } from 'lucide-react';
import { useSheetBackGuard } from '../hooks/useSheetBackGuard';

interface BottomSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

const CLOSE_OFFSET = 90;
const CLOSE_VELOCITY = 500;

export function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
  const dragControls = useDragControls();
  useSheetBackGuard(open, onClose);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > CLOSE_OFFSET || info.velocity.y > CLOSE_VELOCITY) onClose();
  };

  // портал в body: лист не зависит от отступов и transform родителей и всегда поверх нижней панели
  return createPortal(
    <AnimatePresence>
      {open ?
      <motion.div
        key="sheet"
        className="fixed inset-0 z-50 mx-auto flex max-w-[430px] items-end"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}>
        
          <button
          type="button"
          aria-label="Закрыть"
          onClick={onClose}
          className="absolute inset-0 bg-ink/25" />
        
          <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
          drag="y"
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.9 }}
          dragTransition={{ bounceStiffness: 500, bounceDamping: 40 }}
          onDragEnd={onDragEnd}
          className="relative flex max-h-[85%] w-full min-w-0 flex-col rounded-t-[24px] bg-surface supports-[height:100dvh]:max-h-[85dvh]">
          
            <div
            onPointerDown={(e) => dragControls.start(e)}
            className="shrink-0 cursor-grab touch-none px-5 pt-3 active:cursor-grabbing">
            
              <span className="mx-auto mb-3 block h-1 w-10 rounded-full bg-line" aria-hidden="true" />
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
                <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={onClose}
                aria-label="Закрыть"
                className="-mr-1 flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors duration-150 ease-out hover:bg-canvas">
                
                  <XIcon className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
              {children}
            </div>
          </motion.div>
        </motion.div> :
      null}
    </AnimatePresence>,
    document.body
  );

}