import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClockIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CornerDownRightIcon,
  FolderInputIcon,
  Maximize2Icon,
  Trash2Icon } from
'lucide-react';
import { BottomSheet } from '../BottomSheet';
import { SheetOption } from './SheetOption';
import { SphereIcon } from '../SphereIcon';
import { useApp } from '../../contexts/AppContext';
import { spheres } from '../../data/appData';
import { formatTaskDate, quickDates } from '../../utils/taskOptions';
import type { Task } from '../../types';

type View = 'main' | 'date' | 'move' | 'parent';

interface TaskActionSheetProps {
  task: Task | null;
  /** задачи текущего списка — кандидаты в родители */
  siblings: Task[];
  onClose: () => void;
}

const titles: Record<Exclude<View, 'main'>, string> = {
  date: 'Дата завершения',
  move: 'Переместить в список',
  parent: 'Сделать подзадачей'
};

function ActionRow({
  icon,
  label,
  hint,
  onClick,
  chevron = false






}: {icon: React.ReactNode;label: string;hint?: string;onClick: () => void;chevron?: boolean;}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors duration-150 ease-out hover:bg-canvas">
      
      <span className="shrink-0 text-ink-soft">{icon}</span>
      <span className="flex-1 text-[15px] text-ink">{label}</span>
      {hint ? <span className="shrink-0 text-[13px] text-muted">{hint}</span> : null}
      {chevron ?
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.8} aria-hidden="true" /> :
      null}
    </button>);

}

export function TaskActionSheet({ task, siblings, onClose }: TaskActionSheetProps) {
  const navigate = useNavigate();
  const { tasks, sections, updateTask, deleteTask, toggleTask } = useApp();
  const [view, setView] = useState<View>('main');

  useEffect(() => {
    if (task) setView('main');
  }, [task?.id]);

  /** актуальная версия — дата обновляется прямо в листе */
  const live = task ? tasks.find((t) => t.id === task.id) ?? task : null;
  const iconClass = 'h-[18px] w-[18px]';

  const back =
  <button
    type="button"
    onClick={() => setView('main')}
    className="mb-1 flex items-center gap-1 px-0 py-1 text-[13.5px] font-medium text-primary">
    
      <ChevronLeftIcon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
      Назад
    </button>;


  const renderMain = (t: Task) => {
    const sphere = spheres.find((s) => s.id === t.sphere);
    return (
      <>
        <div className="grid grid-cols-2 gap-2">
          {[
          {
            label: 'Подробно',
            icon: <Maximize2Icon className={iconClass} strokeWidth={1.8} />,
            danger: false,
            onClick: () => {
              onClose();
              navigate(`/task/${t.id}`);
            }
          },
          {
            label: 'Удалить',
            icon: <Trash2Icon className={iconClass} strokeWidth={1.8} />,
            danger: true,
            onClick: () => {
              onClose();
              deleteTask(t.id);
            }
          }].
          map((a) =>
          <button
            key={a.label}
            type="button"
            onClick={a.onClick}
            className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-[12.5px] transition-colors duration-150 ease-out ${
            a.danger ?
            'border-[#EBCFC7] text-[#A44A3F] hover:bg-[#FBF1ED]' :
            'border-line text-ink-soft hover:bg-canvas'}`
            }>
            
              {a.icon}
              {a.label}
            </button>
          )}
        </div>

        <div className="-mx-3 mt-3">
          <ActionRow
            icon={<CheckCircle2Icon className={iconClass} strokeWidth={1.8} />}
            label={t.status === 'done' ? 'Вернуть в работу' : 'Отметить как завершённое'}
            onClick={() => {
              toggleTask(t.id);
              onClose();
            }} />
          
          <ActionRow
            icon={<CalendarClockIcon className={iconClass} strokeWidth={1.8} />}
            label="По дате завершения"
            hint={formatTaskDate(t.date)}
            chevron
            onClick={() => setView('date')} />
          
          <div className="mx-3 my-1.5 h-px bg-line" role="separator" />
          <ActionRow
            icon={<FolderInputIcon className={iconClass} strokeWidth={1.8} />}
            label="Переместить в список"
            hint={sphere?.name}
            chevron
            onClick={() => setView('move')} />
          
          <ActionRow
            icon={<CornerDownRightIcon className={iconClass} strokeWidth={1.8} />}
            label="Сделать подзадачей…"
            chevron
            onClick={() => setView('parent')} />
          
        </div>
      </>);

  };

  const renderDate = (t: Task) =>
  <>
      {back}
      <div className="-mx-3">
        {quickDates().map((o) =>
      <SheetOption
        key={o.id}
        label={o.label}
        hint={o.hint}
        selected={t.date === o.date}
        onClick={() => {
          updateTask(t.id, { date: o.date });
          setView('main');
        }} />

      )}
        <SheetOption
        label="Без даты"
        selected={!t.date}
        onClick={() => {
          updateTask(t.id, { date: undefined });
          setView('main');
        }} />
      
      </div>
      <input
      type="date"
      value={t.date ?? ''}
      onChange={(e) => e.target.value && updateTask(t.id, { date: e.target.value })}
      aria-label="Своя дата"
      className="mt-2 w-full rounded-xl border border-line bg-canvas px-3 py-3 text-[15px] text-ink focus:border-primary/50 focus:outline-none" />
    
    </>;


  const renderMove = (t: Task) =>
  <>
      {back}
      <div className="-mx-3">
        {spheres.map((s) => {
        // у «Прочее» разделов нет
        const own = s.id === 'other' ? [] : sections.filter((sec) => sec.sphere === s.id);
        const move = (sectionId?: string) => {
          updateTask(t.id, { sphere: s.id, sectionId, parentId: undefined });
          // подзадачи переезжают вместе с задачей
          tasks.
          filter((c) => c.parentId === t.id).
          forEach((c) => updateTask(c.id, { sphere: s.id }));
          onClose();
        };
        return (
          <div key={s.id}>
              <SheetOption
              label={s.name}
              icon={<SphereIcon id={s.id} color={s.color} />}
              selected={t.sphere === s.id && !own.some((sec) => sec.id === t.sectionId)}
              onClick={() => move()} />
            
              {own.map((sec) =>
            <div key={sec.id} className="pl-7">
                  <SheetOption
                label={sec.title}
                selected={t.sectionId === sec.id}
                onClick={() => move(sec.id)} />
              
                </div>
            )}
            </div>);

      })}
      </div>
    </>;


  const renderParent = (t: Task) => {
    const candidates = siblings.filter(
      (s) => s.id !== t.id && !s.parentId && s.status !== 'cancelled'
    );
    const hasChildren = tasks.some((c) => c.parentId === t.id);
    return (
      <>
        {back}
        {hasChildren ?
        <p className="py-2 text-[14px] leading-relaxed text-muted">
            У этой задачи уже есть подзадачи — сначала вынеси их, чтобы не создавать третий уровень.
          </p> :

        <div className="-mx-3">
            {t.parentId ?
          <SheetOption
            label="Не подзадача"
            onClick={() => {
              updateTask(t.id, { parentId: undefined });
              onClose();
            }} /> :

          null}
            {candidates.length > 0 ?
          candidates.map((p) =>
          <SheetOption
            key={p.id}
            label={p.title}
            selected={t.parentId === p.id}
            onClick={() => {
              updateTask(t.id, {
                parentId: p.id,
                sphere: p.sphere,
                sectionId: p.sectionId
              });
              onClose();
            }} />

          ) :

          <p className="px-3 py-2 text-[14px] text-muted">В этом списке нет других задач.</p>
          }
          </div>
        }
      </>);

  };

  return (
    <BottomSheet
      open={Boolean(task)}
      title={live ? view === 'main' ? live.title : titles[view] : ''}
      onClose={onClose}>
      
      {live ?
      view === 'main' ?
      renderMain(live) :
      view === 'date' ?
      renderDate(live) :
      view === 'move' ?
      renderMove(live) :
      renderParent(live) :
      null}
    </BottomSheet>);

}