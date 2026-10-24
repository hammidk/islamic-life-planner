import React, { useRef, useState } from 'react';
import { CalendarIcon, InfoIcon, Repeat2Icon, TimerIcon } from 'lucide-react';
import { SphereIcon } from '../SphereIcon';
import { PopoverMenu } from '../ui/PopoverMenu';
import { DateTimeScreen } from './DateTimeScreen';
import { DurationSheet } from './DurationSheet';
import { SphereSheet } from './SphereSheet';
import { RepeatSheet } from './RepeatSheet';
import { repeatLabel, repeatMenuItems, repeatRuleForKey } from './repeatMenu';
import { todayISO } from '../../utils/prayer';
import { spheres } from '../../data/appData';
import { dateMenuOptions, formatDateLine, formatShortDate, reminderAfterTimeChange } from '../../utils/taskOptions';
import type { Reminder, RepeatRule, SphereId } from '../../types';

/** Поля минималистичной карточки создания и редактирования */
export interface ComposerFields {
  title: string;
  description: string;
  /** '' — без даты */
  date: string;
  time: string;
  /** минуты строкой; '' — не задана */
  duration: string;
  sphere: SphereId;
  urgent?: boolean;
  repeat?: RepeatRule;
  reminder?: Reminder;
}

export type ComposerPatch = Partial<ComposerFields> & {sectionId?: string;};

interface TaskComposerProps {
  value: ComposerFields;
  onChange: (patch: ComposerPatch) => void;
  /** Enter в названии */
  onSubmit: () => void;
  /** «Подробно» (i) */
  onExpand: () => void;
  inputRef?: React.Ref<HTMLInputElement>;
  autoFocus?: boolean;
  placeholder?: string;
  /** кружок слева: для существующего дела — его состояние */
  done?: boolean;
}

/** Чип — только иконка; выбранное значение показывается текстом рядом */
function Chip({
  icon,
  label,
  value,
  ariaLabel,
  active,
  onClick,
  chipRef









}: {icon: React.ReactNode;label: string;value?: string;ariaLabel?: string;active: boolean;onClick: () => void;chipRef?: React.Ref<HTMLButtonElement>;}) {
  return (
    <button
      ref={chipRef}
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

type SheetKind = 'datetime' | 'duration' | 'sphere' | 'repeat' | null;

/**
 * Минималистичная карточка дела как в «Напоминаниях»: строка даты сверху (если выбрана),
 * название, заметка и чипы-иконки: дата, длительность, сфера, «Подробно».
 */
export function TaskComposer({
  value,
  onChange,
  onSubmit,
  onExpand,
  inputRef,
  autoFocus = true,
  placeholder = 'Новое дело',
  done = false
}: TaskComposerProps) {
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [dateMenu, setDateMenu] = useState(false);
  const [repeatMenu, setRepeatMenu] = useState(false);
  const dateChipRef = useRef<HTMLButtonElement>(null);
  const repeatChipRef = useRef<HTMLButtonElement>(null);
  const sphere = spheres.find((s) => s.id === value.sphere) ?? spheres[spheres.length - 1];
  const iconClass = 'h-4 w-4';

  const options = dateMenuOptions();
  const isPreset = options.some((o) => o.date === value.date);
  const dateItems = [
  { key: 'none', label: 'Нет', selected: !value.date },
  ...options.map((o) => ({ key: o.id, label: o.label, hint: formatShortDate(o.date), selected: value.date === o.date })),
  { key: 'custom', label: 'Настроить…', selected: Boolean(value.date) && !isPreset }];


  const selectDate = (key: string) => {
    setDateMenu(false);
    if (key === 'custom') {
      setSheet('datetime');
      return;
    }
    if (key === 'none') {
      onChange({ date: '', time: '', reminder: reminderAfterTimeChange(value.reminder, undefined) });
      return;
    }
    const option = options.find((o) => o.id === key);
    if (option) onChange({ date: option.date });
  };

  const hasRepeat = Boolean(value.repeat && value.repeat.kind !== 'none');

  /** повтору нужна опорная дата: без даты ставится сегодня */
  const applyRepeat = (rule: RepeatRule) =>
  onChange(rule.kind !== 'none' && !value.date ? { repeat: rule, date: todayISO() } : { repeat: rule });

  const selectRepeat = (key: string) => {
    setRepeatMenu(false);
    const rule = repeatRuleForKey(key);
    if (rule) applyRepeat(rule);else
    setSheet('repeat');
  };

  const dateLine = value.date ? formatDateLine(value.date, value.time || undefined) : '';

  return (
    <div>
      {dateLine ?
      <button
        type="button"
        onClick={() => setSheet('datetime')}
        className="mb-1 pl-[34px] text-left text-[13.5px] font-medium text-primary">

          {dateLine}
          {value.urgent ? <span className="text-[#D93B30]"> · !</span> : null}
        </button> :
      null}

      <div className="flex items-center gap-3">
        <span
          className={`h-[22px] w-[22px] shrink-0 rounded-full border ${done ? 'border-primary bg-primary' : 'border-[#CBD2C9]'}`}
          aria-hidden="true" />

        <input
          ref={inputRef}
          autoFocus={autoFocus}
          value={value.title}
          onChange={(e) => onChange({ title: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder={placeholder}
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
        value={value.description}
        onChange={(e) => onChange({ description: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder="Заметка"
        aria-label="Заметка"
        className="mt-1 w-full bg-transparent pl-[34px] text-[16px] text-ink-soft placeholder:text-muted/70 focus:outline-none" />


      <div className="no-scrollbar -mx-1 mt-3 flex flex-nowrap gap-2 overflow-x-auto px-1 pl-[34px]">
        <Chip
          chipRef={dateChipRef}
          icon={<CalendarIcon className={iconClass} strokeWidth={1.9} aria-hidden="true" />}
          label="Дата"
          value={value.date ? formatDateLine(value.date, value.time || undefined) : undefined}
          active={Boolean(value.date)}
          onClick={() => setDateMenu(true)} />

        <Chip
          chipRef={repeatChipRef}
          icon={<Repeat2Icon className={iconClass} strokeWidth={1.9} aria-hidden="true" />}
          label="Повтор"
          value={hasRepeat ? repeatLabel(value.repeat) : undefined}
          active={hasRepeat}
          onClick={() => setRepeatMenu(true)} />

        <Chip
          icon={<TimerIcon className={iconClass} strokeWidth={1.9} aria-hidden="true" />}
          label="Длительность"
          value={value.duration ? `${value.duration} мин` : undefined}
          active={Boolean(value.duration)}
          onClick={() => setSheet('duration')} />

        <Chip
          icon={<SphereIcon id={sphere.id} color={sphere.color} className={iconClass} />}
          label="Сфера"
          ariaLabel={`Сфера: ${sphere.name}`}
          value={sphere.id !== 'other' ? sphere.name : undefined}
          active={false}
          onClick={() => setSheet('sphere')} />

      </div>

      <PopoverMenu
        open={dateMenu}
        anchor={dateChipRef.current}
        items={dateItems}
        onSelect={selectDate}
        onClose={() => setDateMenu(false)}
        label="Дата" />

      <PopoverMenu
        open={repeatMenu}
        anchor={repeatChipRef.current}
        items={repeatMenuItems(value.repeat)}
        onSelect={selectRepeat}
        onClose={() => setRepeatMenu(false)}
        label="Повтор" />

      <RepeatSheet
        open={sheet === 'repeat'}
        value={value.repeat}
        onSelect={applyRepeat}
        onClose={() => setSheet(null)} />

      <DateTimeScreen
        open={sheet === 'datetime'}
        value={{
          date: value.date,
          time: value.time,
          urgent: Boolean(value.urgent),
          repeat: value.repeat,
          reminder: value.reminder
        }}
        onApply={(v) => {
          onChange({
            date: v.date,
            time: v.time,
            urgent: v.urgent,
            repeat: v.repeat ?? { kind: 'none' },
            reminder: v.reminder
          });
          setSheet(null);
        }}
        onClose={() => setSheet(null)} />

      <DurationSheet
        open={sheet === 'duration'}
        value={value.duration}
        onSelect={(duration) => onChange({ duration })}
        onClose={() => setSheet(null)} />

      <SphereSheet
        open={sheet === 'sphere'}
        value={value.sphere}
        onSelect={(id) => onChange(id !== value.sphere ? { sphere: id, sectionId: '' } : { sphere: id })}
        onClose={() => setSheet(null)} />

    </div>);

}
