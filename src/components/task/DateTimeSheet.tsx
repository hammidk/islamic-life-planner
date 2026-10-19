import React from 'react';
import { XIcon } from 'lucide-react';
import { BottomSheet } from '../BottomSheet';
import { SheetOption } from './SheetOption';
import { quickDates } from '../../utils/taskOptions';
import { todayISO } from '../../utils/prayer';

interface DateTimeSheetProps {
  open: boolean;
  /** '' — без даты */
  date: string;
  time: string;
  onChangeDate: (date: string) => void;
  /** при пустой дате выбор времени ставит сегодняшнюю дату */
  onChangeTime: (time: string, date: string) => void;
  onClose: () => void;
}

const labels: Record<string, string> = {
  today: 'Сегодня',
  tomorrow: 'Завтра',
  weekend: 'На выходных',
  nextWeek: 'На следующей неделе'
};

export function DateTimeSheet({
  open,
  date,
  time,
  onChangeDate,
  onChangeTime,
  onClose
}: DateTimeSheetProps) {
  const options = quickDates();
  const isQuick = options.some((o) => o.date === date);

  return (
    <BottomSheet open={open} title="Дата и время" onClose={onClose}>
      <div className="-mx-3">
        {options.map((o) =>
        <SheetOption
          key={o.id}
          label={labels[o.id] ?? o.label}
          hint={o.hint}
          selected={date === o.date}
          onClick={() => {
            onChangeDate(o.date);
            onClose();
          }} />

        )}
        <SheetOption
          label="Без даты"
          selected={!date}
          onClick={() => {
            onChangeDate('');
            onClose();
          }} />
        
      </div>

      <label className="mt-2 flex items-center gap-3 rounded-xl border border-line bg-canvas px-3 py-2.5">
        <span className="flex-1 text-[15px] text-ink">Настроить</span>
        <input
          type="date"
          value={date && !isQuick ? date : ''}
          onChange={(e) => e.target.value && onChangeDate(e.target.value)}
          aria-label="Своя дата"
          className="bg-transparent text-right text-[16px] text-ink-soft focus:outline-none" />
        
      </label>

      <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-canvas px-3 py-2.5">
        <label htmlFor="sheet-time" className="flex-1 text-[15px] text-ink">
          Время
        </label>
        <input
          id="sheet-time"
          type="time"
          value={time}
          onChange={(e) => onChangeTime(e.target.value, e.target.value && !date ? todayISO() : date)}
          className="bg-transparent text-right text-[16px] text-ink-soft focus:outline-none" />
        
        {time ?
        <button
          type="button"
          onClick={() => onChangeTime('', date)}
          className="flex items-center gap-1 text-[13px] text-muted transition-colors duration-150 ease-out hover:text-ink">
          
            <XIcon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            Убрать
          </button> :
        null}
      </div>
    </BottomSheet>);

}