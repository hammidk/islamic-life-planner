import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { CheckIcon } from 'lucide-react';
import { TaskComposer } from './TaskComposer';
import { useTaskDraft } from '../../contexts/TaskDraftContext';

interface QuickAddSheetProps {
  open: boolean;
  /** закрыть и сбросить черновик */
  onDismiss: () => void;
  /** открыть «Подробно» с тем же черновиком */
  onExpand: () => void;
  /** добавить задачу; false — пустое название */
  onCommit: () => boolean;
}

const CLOSE_OFFSET = 90;
const CLOSE_VELOCITY = 500;

export function QuickAddSheet({ open, onDismiss, onExpand, onCommit }: QuickAddSheetProps) {
  const { draft, updateDraft } = useTaskDraft();
  const dragControls = useDragControls();
  const titleRef = useRef<HTMLInputElement>(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const id = window.setTimeout(() => setAdded(false), 1200);
    return () => window.clearTimeout(id);
  }, [added]);

  useEffect(() => {
    if (!open) setAdded(false);
  }, [open]);

  const submit = () => {
    if (onCommit()) {
      setAdded(true);
      titleRef.current?.focus();
    }
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > CLOSE_OFFSET || info.velocity.y > CLOSE_VELOCITY) onDismiss();
  };

  const canAdd = draft.title.trim().length > 0;

  return (
    <>
      <AnimatePresence>
        {open ?
        <motion.div
          key="quick-add"
          className="fixed inset-0 z-50 mx-auto flex max-w-[430px] items-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}>
          
            <button
            type="button"
            aria-label="Закрыть"
            onClick={onDismiss}
            className="absolute inset-0 bg-ink/25" />
          
            <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Новое дело"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.9 }}
            onDragEnd={onDragEnd}
            className="relative w-full rounded-t-[24px] bg-surface pb-6">
            
              <div
              onPointerDown={(e) => dragControls.start(e)}
              className="cursor-grab touch-none pb-2 pt-3 active:cursor-grabbing">
              
                <span className="mx-auto block h-1 w-10 rounded-full bg-line" aria-hidden="true" />
              </div>

              <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="px-5">
              
                <TaskComposer
                inputRef={titleRef}
                value={{
                  title: draft.title,
                  description: draft.description,
                  date: draft.date,
                  time: draft.time,
                  duration: draft.duration,
                  sphere: draft.sphere,
                  urgent: draft.urgent,
                  repeat: draft.repeat,
                  reminder: draft.reminder
                }}
                onChange={(patch) => updateDraft(patch)}
                onSubmit={submit}
                onExpand={onExpand} />
              

                <div className="mt-4 flex h-9 items-center justify-between">
                  <AnimatePresence>
                    {added ?
                  <motion.span
                    key="added"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                    role="status"
                    className="flex items-center gap-1.5 text-[13px] text-primary">
                    
                        <CheckIcon className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
                        Добавлено
                      </motion.span> :

                  <span />
                  }
                  </AnimatePresence>
                  {canAdd ?
                <button
                  type="submit"
                  className="rounded-full bg-primary px-4 py-2 text-[14px] font-medium text-white transition-transform duration-150 ease-out active:scale-[0.97]">
                  
                      Добавить
                    </button> :
                null}
                </div>
              </form>
            </motion.div>
          </motion.div> :
        null}
      </AnimatePresence>

      
    </>);

}