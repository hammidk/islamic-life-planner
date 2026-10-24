import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useApp } from './AppContext';
import { emptyDraft, useTaskDraft } from './TaskDraftContext';
import type { TaskDraft } from './TaskDraftContext';
import { QuickAddSheet } from '../components/task/QuickAddSheet';
import { FullTaskScreen } from '../components/task/FullTaskScreen';
import { useSheetBackGuard } from '../hooks/useSheetBackGuard';

/** quick — окно снизу (Главная, Дневник); inline — карточка вверху списка; full — «Подробно» */
export type QuickAddMode = 'closed' | 'quick' | 'inline' | 'full';

interface QuickAddState {
  mode: QuickAddMode;
  openQuickAdd: (preset?: Partial<TaskDraft>) => void;
  /** экран со списком дел: «+» создаёт карточку вверху списка с этим контекстом */
  registerInlineHost: (preset: Partial<TaskDraft>) => () => void;
  /** создать дело из карточки и открыть новую пустую с тем же контекстом; false — пустое название */
  commitInline: () => boolean;
  closeInline: () => void;
  /** «Подробно» для создаваемого дела */
  expandDraft: () => void;
  /** дело, открытое для редактирования на своём месте */
  editingId: string | null;
  startEdit: (id: string) => void;
  stopEdit: () => void;
}

const QuickAddContext = createContext<QuickAddState | null>(null);

/** Создание задачи: быстрый лист поверх экрана и полный экран «Подробно» */
export function QuickAddProvider({ children }: {children: React.ReactNode;}) {
  const { draft, resetDraft } = useTaskDraft();
  const { addTask, addChecklistItem } = useApp();
  const [mode, setMode] = useState<QuickAddMode>('closed');
  const presetRef = useRef<Partial<TaskDraft>>({});
  const baselineRef = useRef<string>(JSON.stringify(emptyDraft()));
  const hostRef = useRef<Partial<TaskDraft> | null>(null);
  /** скрытое поле: фокус в нём в момент тапа по «+» открывает клавиатуру на iPhone, дальше фокус переходит в карточку */
  const keyboardProxyRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const openQuickAdd = useCallback(
    (preset?: Partial<TaskDraft>) => {
      const host = hostRef.current;
      presetRef.current = host ? { ...host, ...preset } : preset ?? {};
      const fresh = { ...emptyDraft(), ...presetRef.current };
      baselineRef.current = JSON.stringify(fresh);
      keyboardProxyRef.current?.focus({ preventScroll: true });
      setEditingId(null);
      resetDraft(presetRef.current);
      setMode(host ? 'inline' : 'quick');
    },
    [resetDraft]
  );

  const close = useCallback(() => {
    setMode('closed');
    resetDraft();
  }, [resetDraft]);

  const modeRef = useRef(mode);
  modeRef.current = mode;

  const registerInlineHost = useCallback(
    (preset: Partial<TaskDraft>) => {
      hostRef.current = preset;
      return () => {
        if (hostRef.current === preset) hostRef.current = null;
        // ушли с экрана — карточка вверху списка закрывается
        if (modeRef.current === 'inline') close();
      };
    },
    [close]
  );

  const startEdit = useCallback(
    (id: string) => {
      if (modeRef.current === 'inline') close();
      setEditingId(id);
    },
    [close]
  );
  const stopEdit = useCallback(() => setEditingId(null), []);
  // жест «назад» закрывает редактирование (изменения сохраняются)
  useSheetBackGuard(editingId !== null, stopEdit);

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
      urgent: draft.urgent || undefined,
      intention: draft.intention.trim() || undefined,
      result: draft.result.trim() || undefined
    });
    draft.checklist.forEach((item) => addChecklistItem(id, item));
    return true;
  }, [draft, addTask, addChecklistItem]);

  /** быстрый лист и карточка вверху списка: после добавления — новая пустая с тем же контекстом */
  const commitAndContinue = useCallback((): boolean => {
    if (!commit()) return false;
    const next: Partial<TaskDraft> = {
      ...presetRef.current,
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
    <QuickAddContext.Provider
      value={{
        mode,
        openQuickAdd,
        registerInlineHost,
        commitInline: commitAndContinue,
        closeInline: close,
        expandDraft: () => setMode('full'),
        editingId,
        startEdit,
        stopEdit
      }}>
      
      {children}
      <input
        ref={keyboardProxyRef}
        aria-hidden="true"
        tabIndex={-1}
        className="pointer-events-none fixed left-0 top-0 h-px w-px text-[16px] opacity-0" />
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

/** Экран со списком дел: «+» создаёт дело карточкой вверху этого списка с данным контекстом */
export function useInlineCreateHost(preset: Partial<TaskDraft>): void {
  const { registerInlineHost } = useQuickAdd();
  const key = JSON.stringify(preset);
  useEffect(
    () => registerInlineHost(JSON.parse(key) as Partial<TaskDraft>),
    [registerInlineHost, key]
  );
}

export function useQuickAdd(): QuickAddState {
  const ctx = useContext(QuickAddContext);
  if (!ctx) throw new Error('useQuickAdd must be used within QuickAddProvider');
  return ctx;
}