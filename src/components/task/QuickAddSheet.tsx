import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import {
  BellIcon,
  CalendarIcon,
  CheckIcon,
  InfoIcon,
  Repeat2Icon,
  TimerIcon } from
'lucide-react';
import { TaskSheets } from './TaskSheets';
import type { SheetKind } from './TaskSheets';
import { SphereIcon } from '../SphereIcon';
import { useTaskDraft } from '../../contexts/TaskDraftContext';
import { spheres } from '../../data/appData';
import { formatReminder, formatRepeat, formatTaskDate } from '../../utils/taskOptions';

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

/** Чип — только иконка; выбранное значение показывается текстом рядом */
function Chip({
  icon,
  label,
  value,
  ariaLabel,
  active,
  onClick







}: {icon: React.ReactNode;label: string;value?: string;ariaLabel?: string;active: boolean;onClick: () => void;}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? (value ? `${label}: ${value}` : label)}
      className={`flex h-[34px] min-w-[34px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border text-[13px] transition-colors duration-150 ease-out ${
      value ? 'px-3' : 'px-2.5'} ${
      active ? 'border-primary/40 bg-primary-tint text-primary' : 'border-line text-ink-soft hover:bg-canvas'}`
      }>
      
      {icon}
      {value ? <span aria-hidden="true">{value}</span> : null}
    </button>);

}

export function QuickAddSheet({ open, onDismiss, onExpand, onCommit }: QuickAddSheetProps) {
  const { draft, updateDraft } = useTaskDraft();
  const dragControls = useDragControls();
  const titleRef = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [added, setAdded] = useState(false);
  const sphere = spheres.find((s) => s.id === draft.sphere) ?? spheres[spheres.length - 1];
  const iconClass = 'h-4 w-4';

  useEffect(() => {
    if (!added) return;
    const id = window.setTimeout(() => setAdded(false), 1200);
    return () => window.clearTimeout(id);
  }, [added]);

  useEffect(() => {
    if (!open) {
      setSheet(null);
      setAdded(false);
    }
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

  const dateLabel = draft.date ?
  `${formatTaskDate(draft.date)}${draft.time ? `, ${draft.time}` : ''}` :
  undefined;
  const hasRepeat = Boolean(draft.repeat && draft.repeat.kind !== 'none');
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
              
                <div className="flex items-center gap-3">
                  <span
                  className="h-[22px] w-[22px] shrink-0 rounded-full border border-[#CBD2C9]"
                  aria-hidden="true" />
                
                  <input
                  ref={titleRef}
                  autoFocus
                  value={draft.title}
                  onChange={(e) => updateDraft({ title: e.target.value })}
                  placeholder="Новое дело"
                  aria-label="Название"
                  enterKeyHint="done"
                  className="min-w-0 flex-1 bg-transparent text-[17px] text-ink placeholder:text-muted/80 focus:outline-none" />
                
                  <button
                  type="button"
                  onClick={onExpand}
                  aria-label="Подробно"
                  className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-150 ease-out hover:bg-canvas hover:text-primary">
                  
                    <InfoIcon className="h-[19px] w-[19px]" strokeWidth={1.8} aria-hidden="true" />
                  </button>
                </div>

                <input
                value={draft.description}
                onChange={(e) => updateDraft({ description: e.target.value })}
                placeholder="Добавить заметку"
                aria-label="Заметка"
                className="mt-1.5 w-full bg-transparent pl-[34px] text-[14px] text-ink-soft placeholder:text-muted/70 focus:outline-none" />
              

                <div className="no-scrollbar -mx-5 mt-4 flex flex-nowrap gap-2 overflow-x-auto px-5">
                  <Chip
                  icon={<CalendarIcon className={iconClass} strokeWidth={1.9} aria-hidden="true" />}
                  label="Дата и время"
                  value={dateLabel}
                  active={Boolean(draft.date)}
                  onClick={() => setSheet('datetime')} />
                
                  <Chip
                  icon={<TimerIcon className={iconClass} strokeWidth={1.9} aria-hidden="true" />}
                  label="Длительность"
                  value={draft.duration ? `${draft.duration} мин` : undefined}
                  active={Boolean(draft.duration)}
                  onClick={() => setSheet('duration')} />
                
                  <Chip
                  icon={<BellIcon className={iconClass} strokeWidth={1.9} aria-hidden="true" />}
                  label="Уведомление"
                  value={draft.reminder ? formatReminder(draft.reminder) : undefined}
                  active={Boolean(draft.reminder)}
                  onClick={() => setSheet('reminder')} />
                
                  <Chip
                  icon={<Repeat2Icon className={iconClass} strokeWidth={1.9} aria-hidden="true" />}
                  label="Повтор"
                  value={hasRepeat ? formatRepeat(draft.repeat) : undefined}
                  active={hasRepeat}
                  onClick={() => setSheet('repeat')} />
                
                  <Chip
                  icon={<SphereIcon id={sphere.id} color={sphere.color} className={iconClass} />}
                  label="Сфера"
                  ariaLabel={`Сфера: ${sphere.name}`}
                  value={sphere.id !== 'other' ? sphere.name : undefined}
                  active={false}
                  onClick={() => setSheet('sphere')} />
                
                </div>

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

      <TaskSheets
        open={open ? sheet : null}
        fields={{
          date: draft.date,
          time: draft.time,
          duration: draft.duration,
          reminder: draft.reminder,
          repeat: draft.repeat,
          sphere: draft.sphere
        }}
        onChange={(patch) => {
          // при смене сферы раздел сбрасывается
          if (patch.sphere && patch.sphere !== draft.sphere) updateDraft({ ...patch, sectionId: '' });else
          updateDraft(patch);
        }}
        onClose={() => setSheet(null)} />
      
    </>);

}