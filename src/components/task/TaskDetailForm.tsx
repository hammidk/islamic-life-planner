import React, { useState } from 'react';
import {
  BellIcon,
  CalendarIcon,
  ChevronRightIcon,
  FolderIcon,
  LinkIcon,
  Repeat2Icon,
  TimerIcon } from
'lucide-react';
import { TaskSheets } from './TaskSheets';
import type { SchedulePatch, SheetKind } from './TaskSheets';
import { SheetOption } from './SheetOption';
import { BottomSheet } from '../BottomSheet';
import { SphereIcon } from '../SphereIcon';
import { useApp } from '../../contexts/AppContext';
import { spheres } from '../../data/appData';
import { formatReminder, formatRepeat, formatTaskDate } from '../../utils/taskOptions';
import type { Reminder, RepeatRule, SphereId } from '../../types';

export interface DetailFields {
  description: string;
  link: string;
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
  /** '' — без раздела */
  sectionId: string;
  intention: string;
  result: string;
}

export type DetailPatch = SchedulePatch &
Partial<{
  description: string;
  link: string;
  sectionId: string;
  intention: string;
  result: string;
}>;

interface TaskDetailFormProps {
  fields: DetailFields;
  onChange: (patch: DetailPatch) => void;
  /** подпункты: для черновика — локальные, для задачи — общие */
  checklist: React.ReactNode;
  /** число подпунктов для заголовка */
  checklistCount?: number;
}

const sectionTitle = 'mb-2 mt-6 px-1 text-[12px] font-medium uppercase tracking-[0.08em] text-muted';
const card = 'divide-y divide-line rounded-card border border-line bg-surface shadow-card';

function Row({
  icon,
  label,
  value,
  onClick





}: {icon: React.ReactNode;label: string;value: React.ReactNode;onClick: () => void;}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-150 ease-out hover:bg-canvas/60">
      
      <span className="shrink-0 text-muted">{icon}</span>
      <span className="shrink-0 text-[15px] text-ink">{label}</span>
      <span className="min-w-0 flex-1 truncate text-right text-[13.5px] text-muted">{value}</span>
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.8} aria-hidden="true" />
    </button>);

}

export function TaskDetailForm({ fields, onChange, checklist, checklistCount }: TaskDetailFormProps) {
  const { sections } = useApp();
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [sectionSheet, setSectionSheet] = useState(false);
  const sphere = spheres.find((s) => s.id === fields.sphere) ?? spheres[spheres.length - 1];
  const ownSections = sections.filter((s) => s.sphere === fields.sphere);
  const section = ownSections.find((s) => s.id === fields.sectionId);
  const iconClass = 'h-[17px] w-[17px]';

  const handleSchedule = (patch: SchedulePatch) => {
    // при смене сферы раздел сбрасывается
    if (patch.sphere && patch.sphere !== fields.sphere) onChange({ ...patch, sectionId: '' });else
    onChange(patch);
  };

  const dateLabel = fields.date ?
  `${formatTaskDate(fields.date)}${fields.time ? `, ${fields.time}` : ''}` :
  'Без даты';

  return (
    <>
      <h2 className={sectionTitle}>Заметки</h2>
      <div className={card}>
        <textarea
          value={fields.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Добавить заметку"
          rows={3}
          aria-label="Заметки"
          className="block w-full resize-none bg-transparent px-4 py-3 text-[16px] leading-relaxed text-ink placeholder:text-muted/80 focus:outline-none" />
        
        <label className="flex w-full items-center gap-3 px-4 py-3.5">
          <LinkIcon className={`${iconClass} shrink-0 text-muted`} strokeWidth={1.8} aria-hidden="true" />
          <input
            type="url"
            inputMode="url"
            value={fields.link}
            onChange={(e) => onChange({ link: e.target.value })}
            placeholder="URL"
            aria-label="Ссылка"
            className="min-w-0 flex-1 bg-transparent text-[16px] text-ink placeholder:text-muted/80 focus:outline-none" />
          
        </label>
      </div>

      <h2 className={sectionTitle}>Когда</h2>
      <div className={card}>
        <Row
          icon={<CalendarIcon className={iconClass} strokeWidth={1.8} />}
          label="Дата и время"
          value={dateLabel}
          onClick={() => setSheet('datetime')} />
        
        <Row
          icon={<TimerIcon className={iconClass} strokeWidth={1.8} />}
          label="Длительность"
          value={fields.duration ? `${fields.duration} мин` : 'Не указана'}
          onClick={() => setSheet('duration')} />
        
        <Row
          icon={<BellIcon className={iconClass} strokeWidth={1.8} />}
          label="Напоминание"
          value={formatReminder(fields.reminder)}
          onClick={() => setSheet('reminder')} />
        
        <Row
          icon={<Repeat2Icon className={iconClass} strokeWidth={1.8} />}
          label="Повтор"
          value={formatRepeat(fields.repeat)}
          onClick={() => setSheet('repeat')} />
        
      </div>

      <h2 className={sectionTitle}>Организация</h2>
      <div className={card}>
        <Row
          icon={<SphereIcon id={sphere.id} color={sphere.color} className={iconClass} />}
          label="Сфера"
          value={sphere.name}
          onClick={() => setSheet('sphere')} />
        
        {ownSections.length > 0 ?
        <Row
          icon={<FolderIcon className={iconClass} strokeWidth={1.8} />}
          label="Раздел"
          value={section?.title ?? 'Без раздела'}
          onClick={() => setSectionSheet(true)} /> :

        null}
      </div>

      <h2 className={sectionTitle}>
        Подпункты{checklistCount ? ` · ${checklistCount}` : ''}
      </h2>
      {checklist}

      <h2 className={sectionTitle}>Намерение</h2>
      <div className={card}>
        <label className="block px-4 py-3">
          <span className="block text-[12.5px] text-muted">Зачем</span>
          <textarea
            value={fields.intention}
            onChange={(e) => onChange({ intention: e.target.value })}
            placeholder="Ради чего это дело"
            rows={2}
            className="mt-1 block w-full resize-none bg-transparent text-[16px] leading-relaxed text-ink placeholder:text-muted/70 focus:outline-none" />
          
        </label>
        <label className="block px-4 py-3">
          <span className="block text-[12.5px] text-muted">Ожидаемый результат</span>
          <textarea
            value={fields.result}
            onChange={(e) => onChange({ result: e.target.value })}
            placeholder="Как поймёте, что сделано"
            rows={2}
            className="mt-1 block w-full resize-none bg-transparent text-[16px] leading-relaxed text-ink placeholder:text-muted/70 focus:outline-none" />
          
        </label>
      </div>

      <TaskSheets
        open={sheet}
        fields={fields}
        onChange={handleSchedule}
        onClose={() => setSheet(null)} />
      

      <BottomSheet open={sectionSheet} title="Раздел" onClose={() => setSectionSheet(false)}>
        <div className="-mx-3">
          <SheetOption
            label="Без раздела"
            selected={!section}
            onClick={() => {
              onChange({ sectionId: '' });
              setSectionSheet(false);
            }} />
          
          {ownSections.map((s) =>
          <SheetOption
            key={s.id}
            label={s.title}
            selected={s.id === fields.sectionId}
            onClick={() => {
              onChange({ sectionId: s.id });
              setSectionSheet(false);
            }} />

          )}
        </div>
      </BottomSheet>
    </>);

}