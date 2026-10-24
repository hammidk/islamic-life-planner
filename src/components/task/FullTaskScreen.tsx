import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckIcon, XIcon } from 'lucide-react';
import { TaskDetailForm } from './TaskDetailForm';
import { DraftChecklist } from './DraftChecklist';
import { SheetOption } from './SheetOption';
import { BottomSheet } from '../BottomSheet';
import { useTaskDraft } from '../../contexts/TaskDraftContext';

interface FullTaskScreenProps {
  open: boolean;
  /** крестик: закрыть сразу или спросить о несохранённом */
  onRequestClose: () => void;
  onSave: () => void;
  confirmOpen: boolean;
  onConfirmCancel: () => void;
  onConfirmDiscard: () => void;
}

/** «Подробно» — полный экран создания задачи */
export function FullTaskScreen({
  open,
  onRequestClose,
  onSave,
  confirmOpen,
  onConfirmCancel,
  onConfirmDiscard
}: FullTaskScreenProps) {
  const { draft, updateDraft } = useTaskDraft();
  const canSave = draft.title.trim().length > 0;

  return (
    <>
      <AnimatePresence>
        {open ?
        <motion.div
          key="full-task"
          role="dialog"
          aria-modal="true"
          aria-label="Подробно"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
          className="fixed inset-0 z-50 mx-auto w-full max-w-[430px] overflow-y-auto bg-canvas">
          
            <header className="sticky top-0 z-10 flex items-center justify-between bg-canvas/95 px-3 py-2 backdrop-blur">
              <button
              type="button"
              onClick={onRequestClose}
              aria-label="Закрыть"
              className="flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition-colors duration-150 ease-out hover:bg-line/60">
              
                <XIcon className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
              </button>
              <h1 className="text-[16px] font-semibold text-ink">Подробно</h1>
              <button
              type="button"
              onClick={onSave}
              disabled={!canSave}
              aria-label="Сохранить"
              className="flex h-10 w-10 items-center justify-center rounded-full text-primary transition-[background-color,opacity] duration-150 ease-out hover:bg-primary-tint disabled:opacity-30 disabled:hover:bg-transparent">
              
                <CheckIcon className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
              </button>
            </header>

            <div className="px-5 pb-12 pt-2">
              <div className="rounded-card border border-line bg-surface px-4 py-3.5 shadow-card">
                <input
                autoFocus={!draft.title}
                value={draft.title}
                onChange={(e) => updateDraft({ title: e.target.value })}
                placeholder="Что нужно сделать?"
                aria-label="Название"
                className="w-full bg-transparent text-[18px] font-medium text-ink placeholder:font-normal placeholder:text-muted/80 focus:outline-none" />
              
              </div>

              <TaskDetailForm
              fields={{
                description: draft.description,
                link: draft.link,
                date: draft.date,
                time: draft.time,
                duration: draft.duration,
                reminder: draft.reminder,
                repeat: draft.repeat,
                urgent: draft.urgent,
                sphere: draft.sphere,
                sectionId: draft.sectionId,
                intention: draft.intention,
                result: draft.result
              }}
              onChange={(patch) => updateDraft(patch)}
              checklistCount={draft.checklist.length}
              checklist={
              <DraftChecklist
                items={draft.checklist}
                onChange={(checklist) => updateDraft({ checklist })} />

              } />
            
            </div>
          </motion.div> :
        null}
      </AnimatePresence>

      <BottomSheet open={open && confirmOpen} title="Сохранить дело?" onClose={onConfirmCancel}>
        <div className="-mx-3">
          <SheetOption label="Сохранить" onClick={onSave} />
          <SheetOption label="Не сохранять" onClick={onConfirmDiscard} />
          <SheetOption label="Отмена" onClick={onConfirmCancel} />
        </div>
        {!canSave ?
        <p className="mt-2 px-1 text-[12.5px] text-muted">
            Чтобы сохранить, добавьте название.
          </p> :
        null}
      </BottomSheet>
    </>);

}