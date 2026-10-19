import React from 'react';
import { DateTimeSheet } from './DateTimeSheet';
import { DurationSheet } from './DurationSheet';
import { ReminderSheet } from './ReminderSheet';
import { RepeatSheet } from './RepeatSheet';
import { SphereSheet } from './SphereSheet';
import { reminderAfterTimeChange } from '../../utils/taskOptions';
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
}

export type SchedulePatch = Partial<{
  date: string;
  time: string;
  duration: string;
  reminder: Reminder | undefined;
  repeat: RepeatRule;
  sphere: SphereId;
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
      <DateTimeSheet
        open={open === 'datetime'}
        date={fields.date}
        time={fields.time}
        onChangeDate={(date) => onChange({ date })}
        onChangeTime={(time, date) =>
        onChange({
          time,
          date,
          reminder: reminderAfterTimeChange(fields.reminder, time || undefined)
        })
        }
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