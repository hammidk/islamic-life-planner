import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useApp } from './AppContext';
import { emptyDraft, useTaskDraft } from './TaskDraftContext';
import type { TaskDraft } from './TaskDraftContext';
import { QuickAddSheet } from '../components/task/QuickAddSheet';
import { FullTaskScreen } from '../components/task/FullTaskScreen';
import { useSheetBackGuard } from '../hooks/useSheetBackGuard';

export type QuickAddMode = 'closed' | 'quick' | 'full';

interface QuickAddState {
  mode: QuickAddMode;
  openQuickAdd: (preset?: Partial<TaskDraft>) => void;
}

const QuickAddContext = createContext<QuickAddState | null>(null);

/** Создание задачи: быстрый лист поверх экрана и полный экран «Подробно» */
export function QuickAddProvider({ children }: {children: React.ReactNode;}) {
  const { draft, resetDraft } = useTaskDraft();
  const { addTask, addChecklistItem } = useApp();
  const [mode, setMode] = useState<QuickAddMode>('closed');
  const presetRef = useRef<Partial<TaskDraft>>({});
  const baselineRef = useRef<string>(JSON.stringify(emptyDraft()));

  const openQuickAdd = useCallback(
    (preset?: Partial<TaskDraft>) => {
      presetRef.current = preset ?? {};
      const fresh = { ...emptyDraft(), ...presetRef.current };
      baselineRef.current = JSON.stringify(fresh);
      resetDraft(presetRef.current);
      setMode('quick');
    },
    [resetDraft]
  );

  const close = useCallback(() => {
    setMode('closed');
    resetDraft();
  }, [resetDraft]);

  /** создаёт задачу из черновика; false — пустое название */
  const commit = useCallback((): boolean => {
    const title = draft.title.trim();
    if (!title) return false;
    const id = addTask({
      title,
      description: draft.description.trim() || undefined,
      link: draft.link.trim() || undefined,
      date: draft.date || undefined,
      time: draft.time || undefined,
      duration: Number(draft.duration) || undefined,
      sphere: draft.sphere,
      sectionId: draft.sectionId || undefined,
      reminder: draft.reminder,
      notify: Boolean(draft.reminder),
      repeat: draft.repeat,
      intention: draft.intention.trim() || undefined,
      result: draft.result.trim() || undefined
    });
    draft.checklist.forEach((item) => addChecklistItem(id, item));
    return true;
  }, [draft, addTask, addChecklistItem]);

  /** быстрый лист: после добавления остаётся открытым для следующей задачи */
  const commitAndContinue = useCallback((): boolean => {
    if (!commit()) return false;
    const next: Partial<TaskDraft> = {
      ...(presetRef.current.date ? { date: presetRef.current.date } : {}),
      sphere: draft.sphere,
      sectionId: draft.sectionId
    };
    baselineRef.current = JSON.stringify({ ...emptyDraft(), ...next });
    resetDraft(next);
    return true;
  }, [commit, draft.sphere, draft.sectionId, resetDraft]);

  const saveFull = useCallback(() => {
    setConfirm(false);
    if (commit()) close();
  }, [commit, close]);

  const hasChanges = JSON.stringify(draft) !== baselineRef.current;

  /* одна запись истории на всё создание: жест «назад» закрывает лист или «Подробно» */
  const [confirm, setConfirm] = useState(false);
  const [rearmKey, setRearmKey] = useState(0);
  const guardPoppedRef = useRef(false);

  const requestCloseFull = useCallback(
    (fromBackGesture: boolean) => {
      if (!hasChanges) {
        close();
        return;
      }
      guardPoppedRef.current = fromBackGesture;
      setConfirm(true);
    },
    [hasChanges, close]
  );

  useSheetBackGuard(
    mode !== 'closed',
    () => {
      if (mode === 'full') requestCloseFull(true);else
      close();
    },
    rearmKey
  );

  const cancelConfirm = useCallback(() => {
    setConfirm(false);
    if (guardPoppedRef.current) {
      guardPoppedRef.current = false;
      // запись «Подробно» снята жестом — ставим заново, когда лист подтверждения уберёт свою
      window.setTimeout(() => setRearmKey((k) => k + 1), 200);
    }
  }, []);

  const discard = useCallback(() => {
    setConfirm(false);
    guardPoppedRef.current = false;
    close();
  }, [close]);

  return (
    <QuickAddContext.Provider value={{ mode, openQuickAdd }}>
      {children}
      <QuickAddSheet
        open={mode === 'quick'}
        onDismiss={close}
        onExpand={() => setMode('full')}
        onCommit={commitAndContinue} />
      
      <FullTaskScreen
        open={mode === 'full'}
        onRequestClose={() => requestCloseFull(false)}
        onSave={saveFull}
        confirmOpen={confirm}
        onConfirmCancel={cancelConfirm}
        onConfirmDiscard={discard} />
      
    </QuickAddContext.Provider>);

}

export function useQuickAdd(): QuickAddState {
  const ctx = useContext(QuickAddContext);
  if (!ctx) throw new Error('useQuickAdd must be used within QuickAddProvider');
  return ctx;
}