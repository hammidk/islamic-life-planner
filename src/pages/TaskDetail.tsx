import React from 'react';
import { useParams } from 'react-router-dom';
import { CheckIcon, CornerDownRightIcon } from 'lucide-react';
import { Shell, SubHeader } from '../components/Shell';
import { Checklist } from '../components/Checklist';
import { TaskDetailForm } from '../components/task/TaskDetailForm';
import { useApp } from '../contexts/AppContext';
import { useBack } from '../hooks/useBack';
import { taskChecklistSuggestions } from '../data/taskValues';
import { periodForTime } from '../utils/prayer';
import type { Task } from '../types';

export function TaskDetail() {
  const { id } = useParams();
  const back = useBack();
  const { tasks, goals, checklists, toggleTask, setTaskStatus, updateTask, getSphere } = useApp();

  const task = tasks.find((t) => t.id === id);

  if (!task) {
    return (
      <Shell>
        <SubHeader title="Дело не найдено" />
        <p className="px-1 text-[14px] text-muted">Возможно, оно было удалено.</p>
      </Shell>);

  }

  const parent =
  goals.find((g) => g.id === task.parentId) ?? tasks.find((t) => t.id === task.parentId);
  const done = task.status === 'done';
  const checklistCount = (checklists[task.id] ?? []).length;

  return (
    <Shell>
      <SubHeader title="Дело" subtitle={getSphere(task.sphere).name} />

      <div className="mb-2 rounded-card border border-line bg-surface px-4 py-4 shadow-card">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => toggleTask(task.id)}
            aria-pressed={done}
            aria-label={done ? 'Отменить выполнение' : 'Отметить выполненным'}
            className={`mt-0.5 flex h-[25px] w-[25px] shrink-0 items-center justify-center rounded-full border transition-colors duration-150 ease-out ${
            done ? 'border-primary bg-primary' : 'border-[#CBD2C9]'}`
            }>
            
            {done ? <CheckIcon className="h-3.5 w-3.5 text-white" strokeWidth={2.6} /> : null}
          </button>
          <input
            value={task.title}
            onChange={(e) => updateTask(task.id, { title: e.target.value })}
            onBlur={(e) => {
              // пустое название не сохраняется
              if (!e.target.value.trim()) updateTask(task.id, { title: 'Без названия' });
            }}
            aria-label="Название"
            className={`min-w-0 flex-1 bg-transparent text-[19px] font-semibold leading-snug tracking-[-0.01em] focus:outline-none ${
            done ? 'text-muted line-through' : 'text-ink'}`
            } />
          
        </div>
        {parent ?
        <p className="mt-2 flex items-center gap-1.5 pl-[37px] text-[13px] text-muted">
            <CornerDownRightIcon className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
            Подзадача · <span className="text-primary">{parent.title}</span>
          </p> :
        null}
      </div>

      <TaskDetailForm
        fields={{
          description: task.description ?? '',
          link: task.link ?? '',
          date: task.date ?? '',
          time: task.time ?? '',
          duration: task.duration ? String(task.duration) : '',
          reminder: task.reminder,
          repeat: task.repeat,
          urgent: task.urgent,
          sphere: task.sphere,
          sectionId: task.sectionId ?? '',
          intention: task.intention ?? '',
          result: task.result ?? ''
        }}
        onChange={(patch) => {
          const next: Partial<Omit<Task, 'id'>> = {};
          if ('description' in patch) next.description = patch.description || undefined;
          if ('link' in patch) next.link = patch.link || undefined;
          if ('date' in patch) next.date = patch.date || undefined;
          if ('time' in patch) {
            next.time = patch.time || undefined;
            next.period = periodForTime(next.time, task.period);
          }
          if ('duration' in patch) next.duration = Number(patch.duration) || undefined;
          if ('reminder' in patch) {
            next.reminder = patch.reminder;
            next.notify = Boolean(patch.reminder);
          }
          if (patch.repeat) next.repeat = patch.repeat;
          if ('urgent' in patch) next.urgent = patch.urgent || undefined;
          if (patch.sphere) next.sphere = patch.sphere;
          if ('sectionId' in patch) next.sectionId = patch.sectionId || undefined;
          if ('intention' in patch) next.intention = patch.intention || undefined;
          if ('result' in patch) next.result = patch.result || undefined;
          updateTask(task.id, next);
        }}
        checklistCount={checklistCount}
        checklist={<Checklist targetId={task.id} suggestions={taskChecklistSuggestions} />} />
      

      <div className="mt-6 flex gap-2.5">
        <button
          type="button"
          onClick={() => {
            setTaskStatus(task.id, 'postponed');
            back();
          }}
          className="flex-1 rounded-2xl border border-line bg-surface py-3.5 text-[14.5px] text-ink-soft transition-colors duration-150 ease-out hover:border-primary/40">
          
          Перенести
        </button>
        <button
          type="button"
          onClick={() => {
            setTaskStatus(task.id, 'cancelled');
            back();
          }}
          className="flex-1 rounded-2xl border border-line bg-surface py-3.5 text-[14.5px] text-ink-soft transition-colors duration-150 ease-out hover:border-primary/40">
          
          Отменить
        </button>
      </div>
    </Shell>);

}