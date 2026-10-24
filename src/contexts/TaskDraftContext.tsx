import React, { createContext, useCallback, useContext, useState } from 'react';
import type { Reminder, RepeatRule, SphereId } from '../types';

/** Черновик новой задачи — общий для быстрого листа и экрана «Подробно» */
export interface TaskDraft {
  title: string;
  description: string;
  link: string;
  /** YYYY-MM-DD; '' — без даты */
  date: string;
  time: string;
  /** минуты строкой; '' — не задана */
  duration: string;
  sphere: SphereId;
  sectionId: string;
  reminder?: Reminder;
  repeat?: RepeatRule;
  urgent?: boolean;
  intention: string;
  result: string;
  checklist: string[];
}

export const emptyDraft = (): TaskDraft => ({
  title: '',
  description: '',
  link: '',
  date: '',
  time: '',
  duration: '',
  sphere: 'other',
  sectionId: '',
  intention: '',
  result: '',
  checklist: []
});

interface TaskDraftState {
  draft: TaskDraft;
  updateDraft: (patch: Partial<TaskDraft>) => void;
  /** очищает черновик и применяет пресет */
  resetDraft: (preset?: Partial<TaskDraft>) => void;
}

const TaskDraftContext = createContext<TaskDraftState | null>(null);

export function TaskDraftProvider({ children }: {children: React.ReactNode;}) {
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);

  const updateDraft = useCallback((patch: Partial<TaskDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetDraft = useCallback((preset?: Partial<TaskDraft>) => {
    setDraft({ ...emptyDraft(), ...preset });
  }, []);

  return (
    <TaskDraftContext.Provider value={{ draft, updateDraft, resetDraft }}>
      {children}
    </TaskDraftContext.Provider>);

}

export function useTaskDraft(): TaskDraftState {
  const ctx = useContext(TaskDraftContext);
  if (!ctx) throw new Error('useTaskDraft must be used within TaskDraftProvider');
  return ctx;
}