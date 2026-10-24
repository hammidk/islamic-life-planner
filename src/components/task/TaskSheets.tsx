import React from 'react';
import { DateTimeScreen } from './DateTimeScreen';
import { DurationSheet } from './DurationSheet';
import { ReminderSheet } from './ReminderSheet';
import { RepeatSheet } from './RepeatSheet';
import { SphereSheet } from './SphereSheet';
import type { Reminder, RepeatRule, SphereId } from '../../types';

export interface ScheduleFields {
  /** '' — без даты */
  date: string;
  /** '' — без времени */
  time: string;
  /** '' — не указана */
  duration: string;
  reminder?: Reminder;
  repeat?: RepeatRule;
  sphere: SphereId;
  urgent?: boolean;
}

export type SchedulePatch = Partial<{
  date: string;
  time: string;
  duration: string;
  reminder: Reminder | undefined;
  repeat: RepeatRule;
  sphere: SphereId;
  urgent: boolean;
}>;

export type SheetKind = 'datetime' | 'duration' | 'reminder' | 'repeat' | 'sphere' | null;

interface TaskSheetsProps {
  open: SheetKind;
  fields: ScheduleFields;
  onChange: (patch: SchedulePatch) => void;
  onClose: () => void;
}

/** Общие листы выбора — одни и те же для быстрого листа и экрана «Подробно» */
export function TaskSheets({ open, fields, onChange, onClose }: TaskSheetsProps) {
  return (
    <>
      <DateTimeScreen
        open={open === 'datetime'}
        value={{
          date: fields.date,
          time: fields.time,
          urgent: Boolean(fields.urgent),
          repeat: fields.repeat,
          reminder: fields.reminder
        }}
        onApply={(v) => {
          onChange({
            date: v.date,
            time: v.time,
            urgent: v.urgent,
            reminder: v.reminder,
            repeat: v.repeat ?? { kind: 'none' }
          });
          onClose();
        }}
        onClose={onClose} />
      
      <DurationSheet
        open={open === 'duration'}
        value={fields.duration}
        onSelect={(duration) => onChange({ duration })}
        onClose={onClose} />
      
      <ReminderSheet
        open={open === 'reminder'}
        time={fields.time || undefined}
        value={fields.reminder}
        onSelect={(reminder) => onChange({ reminder })}
        onClose={onClose} />
      
      <RepeatSheet
        open={open === 'repeat'}
        value={fields.repeat}
        onSelect={(repeat) => onChange({ repeat })}
        onClose={onClose} />
      
      <SphereSheet
        open={open === 'sphere'}
        value={fields.sphere}
        onSelect={(sphere) => onChange({ sphere })}
        onClose={onClose} />
      
    </>);

}