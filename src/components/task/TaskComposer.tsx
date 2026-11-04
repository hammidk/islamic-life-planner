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
import { isSubmitEnter } from '../../utils/keyboard';
import { useSpheres } from '../../hooks/useSpheres';
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
  /**
   * prayer — внутри блока намаза: без рамки, белый текст, чипы — прозрачные пилюли
   * bg-white/15 и появляются при фокусе. Состав чипов тот же, кроме сферы (она — в «Подробно»)
   */
  variant?: 'default' | 'prayer';
}

/** Чип — только иконка; выбранное значение показывается текстом рядом */
function Chip({
  icon,
  label,
  value,
  ariaLabel,
  active,
  onClick,
  chipRef,
  prayer = false










}: {icon: React.ReactNode;label: string;value?: string;ariaLabel?: string;active: boolean;onClick: () => void;chipRef?: React.Ref<HTMLButtonElement>;prayer?: boolean;}) {
  return (
    <button
      ref={chipRef}
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? (value ? `${label}: ${value}` : label)}
      className={`flex h-[34px] min-w-[34px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border text-[13px] transition-colors duration-150 ease-out ${
      value ? 'px-3' : 'px-2.5'} ${
      prayer ?
      `border-transparent text-white ${active ? 'bg-white/25' : 'bg-white/15 hover:bg-white/20'}` :
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
  done = false,
  variant = 'default'
}: TaskComposerProps) {
  const prayer = variant === 'prayer';
  const rootRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [dateMenu, setDateMenu] = useState(false);
  const [repeatMenu, setRepeatMenu] = useState(false);
  const dateChipRef = useRef<HTMLButtonElement>(null);
  const repeatChipRef = useRef<HTMLButtonElement>(null);
  const { getSphere } = useSpheres();
  const sphere = getSphere(value.sphere);
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
  /** в блоке намаза чипы видны, пока карточка в фокусе или открыто её меню */
  const chipsVisible = !prayer || focused || dateMenu || repeatMenu || sheet !== null;
  const indent = prayer ? 'pl-[38px]' : 'pl-[34px]';

  return (
    <div
      ref={rootRef}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}>
      {dateLine ?
      <button
        type="button"
        onClick={() => setSheet('datetime')}
        className={`mb-1 text-left text-[13.5px] font-medium ${indent} ${prayer ? 'text-white/80' : 'text-primary'}`}>

          {dateLine}
          {value.urgent ? <span className="text-[#D93B30]"> · !</span> : null}
        </button> :
      null}

      <div className={`flex items-center ${prayer ? 'gap-1' : 'gap-3'}`}>
        {prayer ?
        // как у строк блока: квадрат 17px в области 44px
        <span className="-ml-2.5 flex h-11 w-11 shrink-0 items-center justify-center" aria-hidden="true">
            <span className="h-[17px] w-[17px] rounded-[5px] border border-white/60" />
          </span> :

        <span
          className={`h-[22px] w-[22px] shrink-0 rounded-full border ${done ? 'border-primary bg-primary' : 'border-[#CBD2C9]'}`}
          aria-hidden="true" />
        }

        <input
          ref={inputRef}
          autoFocus={autoFocus}
          value={value.title}
          onChange={(e) => onChange({ title: e.target.value })}
          onKeyDown={(e) => {
            if (isSubmitEnter(e)) {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder={placeholder}
          aria-label="Название"
          enterKeyHint="next"
          className={`min-w-0 flex-1 bg-transparent focus:outline-none ${
          prayer ? 'text-[16px] text-white placeholder:text-white/50' : 'text-[17px] text-ink placeholder:text-muted/80'}`
          } />

        <button
          type="button"
          onClick={onExpand}
          aria-label="Подробно"
          className={`-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-150 ease-out ${
          prayer ? 'text-white/70 hover:bg-white/10 hover:text-white' : 'text-muted hover:bg-canvas hover:text-primary'}`
          }>

          <InfoIcon className="h-[19px] w-[19px]" strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>

      <input
        value={value.description}
        onChange={(e) => onChange({ description: e.target.value })}
        onKeyDown={(e) => {
          if (isSubmitEnter(e)) {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder="Заметка"
        aria-label="Заметка"
        className={`mt-1 w-full bg-transparent text-[16px] focus:outline-none ${indent} ${
        prayer ? 'text-white/70 placeholder:text-white/40' : 'text-ink-soft placeholder:text-muted/70'}`
        } />


      {chipsVisible ?
      <div className={`no-scrollbar -mx-1 mt-3 flex flex-nowrap gap-2 overflow-x-auto px-1 ${indent} ${prayer ? 'pb-2' : ''}`}>
        <Chip
          chipRef={dateChipRef}
          icon={<CalendarIcon className={iconClass} strokeWidth={1.9} aria-hidden="true" />}
          label="Дата"
          value={value.date ? formatDateLine(value.date, value.time || undefined) : undefined}
          active={Boolean(value.date)}
          prayer={prayer}
          onClick={() => setDateMenu(true)} />

        <Chip
          chipRef={repeatChipRef}
          icon={<Repeat2Icon className={iconClass} strokeWidth={1.9} aria-hidden="true" />}
          label="Повтор"
          value={hasRepeat ? repeatLabel(value.repeat) : undefined}
          active={hasRepeat}
          prayer={prayer}
          onClick={() => setRepeatMenu(true)} />

        <Chip
          icon={<TimerIcon className={iconClass} strokeWidth={1.9} aria-hidden="true" />}
          label="Длительность"
          value={value.duration ? `${value.duration} мин` : undefined}
          active={Boolean(value.duration)}
          prayer={prayer}
          onClick={() => setSheet('duration')} />

        {prayer ?
        null :
        <Chip
          icon={<SphereIcon id={sphere.id} color={sphere.color} className={iconClass} />}
          label="Сфера"
          ariaLabel={`Сфера: ${sphere.name}`}
          value={sphere.id !== 'other' ? sphere.name : undefined}
          active={false}
          onClick={() => setSheet('sphere')} />
        }
      </div> :
      null}

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
