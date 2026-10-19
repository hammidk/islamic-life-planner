import React, { useEffect, useState } from 'react';
import { BottomSheet } from '../BottomSheet';
import { useApp } from '../../contexts/AppContext';
import { weekdayShort } from '../../utils/taskOptions';
import type { HabitEnd, HabitWindowId } from '../../types';

interface HabitFormSheetProps {
  open: boolean;
  onClose: () => void;
}

export const habitWindows: {id: HabitWindowId;label: string;}[] = [
{ id: 'fajr', label: 'Фаджр → Зухр' },
{ id: 'dhuhr', label: 'Зухр → Аср' },
{ id: 'asr', label: 'Аср → Магриб' },
{ id: 'maghrib', label: 'Магриб → Иша' },
{ id: 'isha', label: 'Иша → Фаджр' }];


const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const chip = (on: boolean) =>
`rounded-full border px-3 py-1.5 text-[13px] transition-colors duration-150 ease-out ${
on ? 'border-primary/50 bg-primary-tint font-medium text-primary' : 'border-line text-ink-soft'}`;


const input =
'w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-[15px] text-ink placeholder:text-muted/70 focus:border-primary/50 focus:outline-none';

const label = 'mb-1.5 block px-1 text-[12.5px] text-muted';

/** Создание привычки: обязательно только название */
export function HabitFormSheet({ open, onClose }: HabitFormSheetProps) {
  const { addHabit } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [windowId, setWindowId] = useState<HabitWindowId | ''>('');
  const [days, setDays] = useState<number[]>(ALL_DAYS);
  const [endKind, setEndKind] = useState<HabitEnd['kind']>('none');
  const [endCount, setEndCount] = useState('30');
  const [endDate, setEndDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('');
  const [intention, setIntention] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setDescription('');
    setWindowId('');
    setDays(ALL_DAYS);
    setEndKind('none');
    setEndCount('30');
    setEndDate('');
    setTime('');
    setDuration('');
    setIntention('');
  }, [open]);

  const canSave = title.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    const count = Math.round(Number(endCount));
    const end: HabitEnd =
    endKind === 'count' && count > 0 ?
    { kind: 'count', count } :
    endKind === 'date' && endDate ?
    { kind: 'date', date: endDate } :
    { kind: 'none' };
    addHabit({
      title: title.trim(),
      description: description.trim() || undefined,
      windowId: windowId || undefined,
      daysOfWeek: days.length > 0 && days.length < 7 ? [...days].sort((a, b) => a - b) : undefined,
      end,
      time: time || undefined,
      duration: Number(duration) > 0 ? Math.round(Number(duration)) : undefined,
      intention: intention.trim() || undefined
    });
    onClose();
  };

  return (
    <BottomSheet open={open} title="Новая привычка" onClose={onClose}>
      <div className="space-y-4">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Название"
          aria-label="Название"
          className={input} />
        
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Описание"
          aria-label="Описание"
          rows={2}
          className={`${input} resize-none`} />
        

        <div>
          <span className={label}>Окно намаза</span>
          <div className="flex flex-wrap gap-1.5">
            {habitWindows.map((w) =>
            <button
              key={w.id}
              type="button"
              aria-pressed={windowId === w.id}
              onClick={() => setWindowId(w.id)}
              className={chip(windowId === w.id)}>
              
                {w.label}
              </button>
            )}
            <button
              type="button"
              aria-pressed={windowId === ''}
              onClick={() => setWindowId('')}
              className={chip(windowId === '')}>
              
              Без привязки
            </button>
          </div>
        </div>

        <div>
          <span className={label}>Дни недели</span>
          <div className="grid grid-cols-7 gap-1.5">
            {weekdayShort.map((d, i) => {
              const on = days.includes(i);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setDays((prev) => on ? prev.filter((x) => x !== i) : [...prev, i])}
                  className={`rounded-lg border py-2 text-[13px] transition-colors duration-150 ease-out ${
                  on ?
                  'border-primary/50 bg-primary-tint font-medium text-primary' :
                  'border-line text-ink-soft'}`
                  }>
                  
                  {d}
                </button>);

            })}
          </div>
        </div>

        <div>
          <span className={label}>Окончание</span>
          <div className="flex flex-wrap gap-1.5">
            {(
            [
            { id: 'none', label: 'Бессрочно' },
            { id: 'count', label: 'После N повторений' },
            { id: 'date', label: 'До даты' }] as
            const).
            map((o) =>
            <button
              key={o.id}
              type="button"
              aria-pressed={endKind === o.id}
              onClick={() => setEndKind(o.id)}
              className={chip(endKind === o.id)}>
              
                {o.label}
              </button>
            )}
          </div>
          {endKind === 'count' ?
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={endCount}
            onChange={(e) => setEndCount(e.target.value)}
            aria-label="Число повторений"
            className={`${input} mt-2`} /> :

          null}
          {endKind === 'date' ?
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            aria-label="Дата окончания"
            className={`${input} mt-2`} /> :

          null}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className={label}>Время</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={input} />
            
          </label>
          <label>
            <span className={label}>Длительность, мин</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="—"
              className={input} />
            
          </label>
        </div>

        <label className="block">
          <span className={label}>Зачем</span>
          <textarea
            value={intention}
            onChange={(e) => setIntention(e.target.value)}
            placeholder="Ради чего эта привычка"
            rows={2}
            className={`${input} resize-none`} />
          
        </label>

        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="w-full rounded-2xl bg-primary py-3.5 text-[15px] font-medium text-white transition-[transform,opacity] duration-150 ease-out active:scale-[0.99] disabled:opacity-40">
          
          Создать привычку
        </button>
      </div>
    </BottomSheet>);

}