import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlarmClockIcon,
  BellIcon,
  CalendarIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  ClockIcon,
  Repeat2Icon,
  XIcon } from
'lucide-react';
import { addMonths, format, startOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import { IosSwitch } from '../ui/IosSwitch';
import { PopoverMenu } from '../ui/PopoverMenu';
import type { PopoverItem } from '../ui/PopoverMenu';
import { RepeatSheet } from './RepeatSheet';
import { repeatLabel, repeatMenuItems, repeatRuleForKey } from './repeatMenu';
import { useSheetBackGuard } from '../../hooks/useSheetBackGuard';
import { todayISO } from '../../utils/prayer';
import {
  absoluteReminders,
  formatFullDate,
  reminderAfterTimeChange,
  safeParseISO,
  weekdayShort } from
'../../utils/taskOptions';
import type { Reminder, RepeatRule } from '../../types';

export interface DateTimeValue {
  /** '' — без даты */
  date: string;
  /** '' — без времени */
  time: string;
  urgent: boolean;
  repeat?: RepeatRule;
  reminder?: Reminder;
}

interface DateTimeScreenProps {
  open: boolean;
  value: DateTimeValue;
  /** галочка: применить */
  onApply: (value: DateTimeValue) => void;
  /** крестик или жест «назад»: закрыть без сохранения */
  onClose: () => void;
}

const iso = (d: Date) => format(d, 'yyyy-MM-dd');
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const ease = [0.23, 1, 0.32, 1] as const;

/* ---------- календарь ---------- */

function MonthCalendar({ value, onChange }: {value: string;onChange: (date: string) => void;}) {
  const today = todayISO();
  const [month, setMonth] = useState(() => startOfMonth(safeParseISO(value) ?? safeParseISO(today) ?? new Date()));
  const [picking, setPicking] = useState(false);

  const first = startOfMonth(month);
  const lead = (first.getDay() + 6) % 7; // неделя с понедельника
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [
  ...Array.from({ length: lead }, () => null),
  ...Array.from({ length: daysInMonth }, (_, i) => iso(new Date(month.getFullYear(), month.getMonth(), i + 1)))];

  const title = `${capitalize(format(month, 'LLLL yyyy', { locale: ru }))} г.`;
  const navButton = 'flex h-11 w-11 items-center justify-center rounded-full text-primary transition-colors duration-150 ease-out hover:bg-primary-tint';

  return (
    <div className="px-2 pb-2">
      <div className="flex items-center justify-between pl-2.5">
        <button
          type="button"
          onClick={() => setPicking((v) => !v)}
          aria-expanded={picking}
          className="flex h-11 items-center gap-1 text-[17px] font-semibold text-ink">

          {title}
          <ChevronRightIcon
            className={`h-[18px] w-[18px] text-primary transition-transform duration-200 ease-out ${picking ? 'rotate-90' : ''}`}
            strokeWidth={2.4}
            aria-hidden="true" />

        </button>
        {!picking ?
        <span className="flex">
            <button type="button" aria-label="Предыдущий месяц" onClick={() => setMonth((m) => addMonths(m, -1))} className={navButton}>
              <ChevronLeftIcon className="h-[22px] w-[22px]" strokeWidth={2.4} aria-hidden="true" />
            </button>
            <button type="button" aria-label="Следующий месяц" onClick={() => setMonth((m) => addMonths(m, 1))} className={navButton}>
              <ChevronRightIcon className="h-[22px] w-[22px]" strokeWidth={2.4} aria-hidden="true" />
            </button>
          </span> :
        null}
      </div>

      {picking ?
      <div className="px-2 pb-2 pt-1">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="Предыдущий год" onClick={() => setMonth((m) => addMonths(m, -12))} className={navButton}>
              <ChevronLeftIcon className="h-[22px] w-[22px]" strokeWidth={2.4} aria-hidden="true" />
            </button>
            <span className="text-[17px] font-semibold tabular-nums text-ink">{month.getFullYear()}</span>
            <button type="button" aria-label="Следующий год" onClick={() => setMonth((m) => addMonths(m, 12))} className={navButton}>
              <ChevronRightIcon className="h-[22px] w-[22px]" strokeWidth={2.4} aria-hidden="true" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 12 }, (_, i) => {
            const selected = i === month.getMonth();
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setMonth(new Date(month.getFullYear(), i, 1));
                  setPicking(false);
                }}
                className={`h-11 rounded-xl text-[16px] transition-colors duration-150 ease-out ${
                selected ? 'bg-primary font-semibold text-white' : 'text-ink hover:bg-canvas'}`
                }>

                  {capitalize(format(new Date(2026, i, 1), 'LLLL', { locale: ru }))}
                </button>);

          })}
          </div>
        </div> :

      <>
          <div className="grid grid-cols-7 pb-1 pt-1">
            {weekdayShort.map((d) =>
          <span key={d} className="text-center text-[13px] font-semibold uppercase text-muted/80">
                {d}
              </span>
          )}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((date, i) => {
            if (!date) return <span key={`empty-${i}`} className="h-11" aria-hidden="true" />;
            const selected = date === value;
            const isToday = date === today;
            return (
              <button
                key={date}
                type="button"
                onClick={() => onChange(date)}
                aria-pressed={selected}
                aria-label={formatFullDate(date)}
                className="flex h-11 min-w-0 items-center justify-center">

                  <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-[22px] leading-none tabular-nums transition-colors duration-150 ease-out ${
                  selected ?
                  'bg-primary font-semibold text-white' :
                  isToday ?
                  'bg-primary-tint font-semibold text-primary' :
                  'text-ink'}`
                  }>

                    {Number(date.slice(8))}
                  </span>
                </button>);

          })}
          </div>
        </>
      }
    </div>);

}

/* ---------- колесо времени ---------- */

const ITEM = 36;
const VISIBLE = 5;

function WheelColumn({
  count,
  value,
  onChange,
  label




}: {count: number;value: number;onChange: (v: number) => void;label: string;}) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = value * ITEM;
    // только при появлении колеса: дальше значение задаёт прокрутка
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onScroll = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const index = Math.min(count - 1, Math.max(0, Math.round(el.scrollTop / ITEM)));
      if (index !== value) onChange(index);
    }, 90);
  };

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      role="listbox"
      aria-label={label}
      className="no-scrollbar relative h-[180px] w-16 snap-y snap-mandatory overflow-y-scroll overscroll-contain"
      style={{ paddingTop: ITEM * ((VISIBLE - 1) / 2), paddingBottom: ITEM * ((VISIBLE - 1) / 2) }}>

      {Array.from({ length: count }, (_, i) =>
      <button
        key={i}
        type="button"
        role="option"
        aria-selected={i === value}
        onClick={() => {
          ref.current?.scrollTo({ top: i * ITEM, behavior: 'smooth' });
        }}
        className={`flex w-full snap-center items-center justify-center text-[22px] tabular-nums transition-colors duration-100 ${
        i === value ? 'text-ink' : 'text-muted/60'}`
        }
        style={{ height: ITEM }}>

          {String(i).padStart(2, '0')}
        </button>
      )}
    </div>);

}

function TimeWheel({ value, onChange }: {value: string;onChange: (time: string) => void;}) {
  const [h, m] = value.split(':').map(Number);
  // последнее значение: часы и минуты могут смениться в одном такте — не затираем друг друга
  const latest = useRef(value);
  latest.current = value;
  const update = (part: 'h' | 'm', n: number) => {
    const [hh, mm] = latest.current.split(':').map(Number);
    const next = `${String(part === 'h' ? n : hh).padStart(2, '0')}:${String(part === 'm' ? n : mm).padStart(2, '0')}`;
    latest.current = next;
    onChange(next);
  };
  return (
    <div className="relative mx-auto flex w-fit items-center gap-2 py-2">
      {/* центральная выделенная полоса */}
      <span
        className="pointer-events-none absolute inset-x-0 top-1/2 h-9 -translate-y-1/2 rounded-[10px] bg-canvas"
        aria-hidden="true" />

      <div className="relative">
        <WheelColumn count={24} value={h} onChange={(v) => update('h', v)} label="Часы" />
      </div>
      <span className="relative text-[22px] font-semibold text-ink">:</span>
      <div className="relative">
        <WheelColumn count={60} value={m} onChange={(v) => update('m', v)} label="Минуты" />
      </div>
    </div>);

}

/* ---------- строки ---------- */

const rowIcon = 'h-[22px] w-[22px] shrink-0 text-muted';

function Divider() {
  return <span className="ml-[52px] block border-t border-line" aria-hidden="true" />;
}

function SwitchRow({
  icon,
  title,
  subtitle,
  checked,
  onChange







}: {icon: React.ReactNode;title: string;subtitle?: string;checked: boolean;onChange: (v: boolean) => void;}) {
  return (
    <div className="flex min-h-[56px] items-center gap-3.5 py-2 pl-4 pr-4">
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] leading-snug text-ink">{title}</span>
        {subtitle ? <span className="block text-[15px] leading-snug text-primary">{subtitle}</span> : null}
      </span>
      <IosSwitch checked={checked} onChange={onChange} label={title} />
    </div>);

}

const Collapse = ({ open, children }: {open: boolean;children: React.ReactNode;}) =>
<AnimatePresence initial={false}>
    {open ?
  <motion.div
    key="c"
    initial={{ height: 0, opacity: 0 }}
    animate={{ height: 'auto', opacity: 1 }}
    exit={{ height: 0, opacity: 0 }}
    transition={{ duration: 0.2, ease }}
    className="overflow-hidden">

        {children}
      </motion.div> :
  null}
  </AnimatePresence>;


/* ---------- экран ---------- */

type MenuKind = 'repeat' | 'reminder' | null;

/** Полноэкранный «Дата и время» по образцу «Напоминаний» iOS: дата, время, срочное, повтор, раннее напоминание */
export function DateTimeScreen({ open, value, onApply, onClose }: DateTimeScreenProps) {
  const [draft, setDraft] = useState<DateTimeValue>(value);
  const [dateOpen, setDateOpen] = useState(false);
  const [menu, setMenu] = useState<MenuKind>(null);
  const [repeatSheet, setRepeatSheet] = useState(false);
  const repeatRef = useRef<HTMLButtonElement>(null);
  const reminderRef = useRef<HTMLButtonElement>(null);

  useSheetBackGuard(open, onClose);

  useEffect(() => {
    if (!open) return;
    setDraft(value);
    setDateOpen(Boolean(value.date) && !value.time);
    setMenu(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const patch = (next: Partial<DateTimeValue>) => setDraft((d) => ({ ...d, ...next }));

  const setTime = (time: string, date = draft.date) =>
  setDraft((d) => ({ ...d, time, date, reminder: reminderAfterTimeChange(d.reminder, time || undefined) }));

  const toggleDate = (on: boolean) => {
    if (on) {
      patch({ date: draft.date || todayISO() });
      setDateOpen(true);
    } else {
      setDraft((d) => ({ ...d, date: '', time: '', reminder: reminderAfterTimeChange(d.reminder, undefined) }));
      setDateOpen(false);
    }
  };

  const toggleTime = (on: boolean) => {
    // время требует даты
    if (on) setTime(draft.time || '09:00', draft.date || todayISO());else
    setTime('');
  };

  const repeatItems = repeatMenuItems(draft.repeat);
  const repeatText = repeatLabel(draft.repeat);

  const relativeOptions = [
  { key: 'r0', label: 'В момент события', minutes: 0 },
  { key: 'r5', label: 'За 5 минут', minutes: 5 },
  { key: 'r15', label: 'За 15 минут', minutes: 15 },
  { key: 'r30', label: 'За 30 минут', minutes: 30 },
  { key: 'r60', label: 'За 1 час', minutes: 60 },
  { key: 'r1440', label: 'За 1 день', minutes: 1440 }];

  const reminder = draft.reminder;
  const reminderItems: PopoverItem[] = [
  { key: 'none', label: 'Нет', selected: !reminder },
  ...(draft.time ?
  relativeOptions.map((o) => ({
    key: o.key,
    label: o.label,
    selected: reminder?.kind === 'relative' && reminder.minutes === o.minutes
  })) :
  absoluteReminders.map((r) => ({
    key: `a${r.time}`,
    label: r.label,
    hint: r.time,
    selected: reminder?.kind === 'absolute' && reminder.time === r.time
  })))];

  const reminderLabel = !reminder ?
  'Нет' :
  reminder.kind === 'absolute' ?
  absoluteReminders.find((r) => r.time === reminder.time)?.label ?? reminder.time :
  relativeOptions.find((o) => o.minutes === reminder.minutes)?.label ?? `За ${reminder.minutes} мин`;

  const selectRepeat = (key: string) => {
    setMenu(null);
    const rule = repeatRuleForKey(key);
    if (rule) patch({ repeat: rule });else
    setRepeatSheet(true);
  };

  const selectReminder = (key: string) => {
    setMenu(null);
    if (key === 'none') patch({ reminder: undefined });else
    if (key.startsWith('a')) patch({ reminder: { kind: 'absolute', time: key.slice(1) } });else
    patch({ reminder: { kind: 'relative', minutes: Number(key.slice(1)) } });
  };

  const menuRow = 'flex min-h-[52px] w-full items-center gap-3.5 py-2 pl-4 pr-3 text-left transition-colors duration-100 ease-out active:bg-canvas';

  return createPortal(
    <>
      <AnimatePresence>
        {open ?
        <motion.div
          key="dt"
          className="fixed inset-0 z-[60] mx-auto max-w-[430px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease }}>

            <button type="button" aria-label="Закрыть" onClick={onClose} className="absolute inset-0 bg-ink/30" />
            <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Дата и время"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.3, ease }}
            className="absolute inset-x-0 bottom-0 top-[44px] flex min-w-0 flex-col overflow-hidden rounded-t-[28px] bg-canvas">

              <header className="flex shrink-0 items-center justify-between px-4 pb-2 pt-3">
                <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть без сохранения"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-ink/[0.06] text-ink transition-colors duration-150 ease-out hover:bg-ink/10">

                  <XIcon className="h-[20px] w-[20px]" strokeWidth={2.2} aria-hidden="true" />
                </button>
                <h2 className="text-[17px] font-semibold text-ink">Дата и время</h2>
                <button
                type="button"
                onClick={() => onApply(draft)}
                aria-label="Применить"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white transition-transform duration-150 ease-out active:scale-95">

                  <CheckIcon className="h-[21px] w-[21px]" strokeWidth={2.6} aria-hidden="true" />
                </button>
              </header>

              <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
                <p className="mb-1.5 mt-3 px-4 text-[13px] text-muted">Дата и время</p>
                <div className="overflow-hidden rounded-[22px] bg-surface">
                  <div className="flex min-h-[56px] items-center gap-3.5 py-2 pl-4 pr-4">
                    <CalendarIcon className={rowIcon} strokeWidth={1.8} aria-hidden="true" />
                    {/* тап по строке раскрывает/сворачивает календарь, если дата есть */}
                    <button
                    type="button"
                    onClick={() => draft.date && setDateOpen((v) => !v)}
                    aria-expanded={Boolean(draft.date) && dateOpen}
                    className="min-w-0 flex-1 text-left">

                      <span className="block text-[17px] leading-snug text-ink">Дата</span>
                      {draft.date ?
                    <span className="block text-[15px] leading-snug text-primary">
                          {formatFullDate(draft.date)}
                        </span> :
                    null}
                    </button>
                    <IosSwitch checked={Boolean(draft.date)} onChange={toggleDate} label="Дата" />
                  </div>
                  <Collapse open={Boolean(draft.date) && dateOpen}>
                    <Divider />
                    <MonthCalendar value={draft.date} onChange={(date) => patch({ date })} />
                  </Collapse>

                  <Divider />
                  <SwitchRow
                  icon={<ClockIcon className={rowIcon} strokeWidth={1.8} aria-hidden="true" />}
                  title="Время"
                  subtitle={draft.time || undefined}
                  checked={Boolean(draft.time)}
                  onChange={toggleTime} />

                  <Collapse open={Boolean(draft.time)}>
                    <Divider />
                    <TimeWheel value={draft.time || '09:00'} onChange={(time) => setTime(time)} />
                  </Collapse>

                  <Divider />
                  <SwitchRow
                  icon={<AlarmClockIcon className={rowIcon} strokeWidth={1.8} aria-hidden="true" />}
                  title="Срочное"
                  checked={draft.urgent}
                  onChange={(urgent) => patch({ urgent })} />

                </div>
                <p className="mt-2 px-4 text-[13px] leading-snug text-muted">
                  Срочные дела отмечаются значком «!» в списках.
                </p>

                <div className="mt-6 overflow-hidden rounded-[22px] bg-surface">
                  <button ref={repeatRef} type="button" onClick={() => setMenu('repeat')} className={menuRow}>
                    <Repeat2Icon className={rowIcon} strokeWidth={1.8} aria-hidden="true" />
                    <span className="flex-1 text-[17px] text-ink">Повтор</span>
                    <span className="min-w-0 truncate text-[17px] text-muted">{repeatText}</span>
                    <ChevronsUpDownIcon className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} aria-hidden="true" />
                  </button>
                  <Divider />
                  <button ref={reminderRef} type="button" onClick={() => setMenu('reminder')} className={menuRow}>
                    <BellIcon className={rowIcon} strokeWidth={1.8} aria-hidden="true" />
                    <span className="flex-1 text-[17px] text-ink">Раннее напоминание</span>
                    <span className="min-w-0 truncate text-[17px] text-muted">{reminderLabel}</span>
                    <ChevronsUpDownIcon className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div> :
        null}
      </AnimatePresence>

      <PopoverMenu
        open={open && menu === 'repeat'}
        anchor={repeatRef.current}
        items={repeatItems}
        onSelect={selectRepeat}
        onClose={() => setMenu(null)}
        label="Повтор" />

      <PopoverMenu
        open={open && menu === 'reminder'}
        anchor={reminderRef.current}
        items={reminderItems}
        onSelect={selectReminder}
        onClose={() => setMenu(null)}
        label="Раннее напоминание" />

      <RepeatSheet
        open={open && repeatSheet}
        value={draft.repeat}
        onSelect={(rule) => patch({ repeat: rule })}
        onClose={() => setRepeatSheet(false)} />

    </>,
    document.body
  );
}
