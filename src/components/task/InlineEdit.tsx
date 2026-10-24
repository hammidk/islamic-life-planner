import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TaskComposer } from './TaskComposer';
import type { ComposerFields, ComposerPatch } from './TaskComposer';
import { useApp } from '../../contexts/AppContext';
import { useQuickAdd } from '../../contexts/QuickAddContext';
import { useOutsideTap } from '../../hooks/useOutsideTap';
import { periodForTime } from '../../utils/prayer';
import type { Task } from '../../types';

const fieldsOf = (task: Task): ComposerFields => ({
  title: task.title,
  description: task.description ?? '',
  date: task.date ?? '',
  time: task.time ?? '',
  duration: task.duration ? String(task.duration) : '',
  sphere: task.sphere,
  urgent: task.urgent,
  repeat: task.repeat,
  reminder: task.reminder
});

/**
 * Дело, открытое на своём месте в той же минималистичной карточке, что и при создании.
 * Изменения сохраняются, когда карточка закрывается: Enter, тап вне неё, жест «назад»,
 * «Подробно» или уход с экрана.
 */
export function InlineEdit({ task }: {task: Task;}) {
  const navigate = useNavigate();
  const { updateTask } = useApp();
  const { stopEdit } = useQuickAdd();
  const rootRef = useRef<HTMLDivElement>(null);
  const [fields, setFields] = useState<ComposerFields>(() => fieldsOf(task));
  const [sectionId, setSectionId] = useState<string | undefined>(task.sectionId);

  const latest = useRef({ fields, sectionId });
  latest.current = { fields, sectionId };

  /* сохранение при закрытии карточки по любой причине */
  useEffect(
    () => () => {
      const { fields: f, sectionId: section } = latest.current;
      const time = f.time || undefined;
      updateTask(task.id, {
        // пустое название не сохраняется
        title: f.title.trim() || task.title,
        description: f.description.trim() || undefined,
        date: f.date || undefined,
        time,
        period: periodForTime(time, task.period),
        duration: Number(f.duration) || undefined,
        sphere: f.sphere,
        sectionId: section || undefined,
        urgent: f.urgent || undefined,
        repeat: f.repeat,
        reminder: f.reminder,
        notify: Boolean(f.reminder)
      });
    },
    // сохраняем только при размонтировании
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useOutsideTap(rootRef, true, stopEdit);

  const onChange = (patch: ComposerPatch) => {
    const { sectionId: nextSection, ...rest } = patch;
    if (nextSection !== undefined) setSectionId(nextSection || undefined);
    setFields((prev) => ({ ...prev, ...rest }));
  };

  return (
    <div ref={rootRef} className="my-1 rounded-xl bg-surface px-3 py-3 shadow-card ring-1 ring-primary/30">
      <TaskComposer
        value={fields}
        onChange={onChange}
        onSubmit={stopEdit}
        onExpand={() => {
          stopEdit();
          navigate(`/task/${task.id}`);
        }}
        done={task.status === 'done'}
        placeholder="Название" />
      
    </div>);

}
