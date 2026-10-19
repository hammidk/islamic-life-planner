import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState } from
'react';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { spheres } from '../data/appData';
import { useLive } from './LiveDataContext';
import { useAuth } from './AuthContext';
import {
  currentPeriodIndex,
  fromMinutes,
  getPrayerState,
  periodForTime,
  todayISO } from
'../utils/prayer';
import { HISTORY_DAYS, rollHabit, toggleHabitToday } from '../utils/habits';
import { saveUserData } from '../utils/userData';
import type { UserSnapshot } from '../utils/userData';
import type {
  ChecklistItem,
  Goal,
  Habit,
  JournalEntry,
  Period,
  PeriodId,
  Prayer,
  Section,
  Sphere,
  SphereId,
  SphereSlot,
  Task } from
'../types';

export type NewTask = Omit<Task, 'id' | 'status' | 'sphere' | 'period'> & {
  /** без сферы задача попадает в сферу «Прочее» */
  sphere?: SphereId;
  /** вычисляется автоматически по времени, если не передан */
  period?: PeriodId;
  /** id существующей задачи, с которой новая выполняется параллельно */
  parallelWithId?: string;
};

export type NewHabit = Pick<
  Habit,
  'description' | 'windowId' | 'time' | 'duration' | 'daysOfWeek' | 'end' | 'intention'> &
{title: string;};

export type SyncStatus = 'saved' | 'saving' | 'offline';

interface AppState {
  now: string;
  tasks: Task[];
  habits: Habit[];
  goals: Goal[];
  journal: JournalEntry[];
  currentPrayer: Prayer;
  nextPrayer: Prayer;
  currentPeriod: Period;
  addTask: (task: NewTask) => string;
  sections: Section[];
  addSection: (sphere: SphereId, title: string) => string;
  updateTask: (id: string, patch: Partial<Omit<Task, 'id'>>) => void;
  /** удаляет задачу вместе с её подзадачами */
  deleteTask: (id: string) => void;
  /** сохраняет ручной порядок: ids в новом порядке */
  reorderTasks: (ids: string[]) => void;
  toggleTask: (id: string) => void;
  /** пункты, прикреплённые к задаче или намазу (ключ — id задачи или намаза) */
  checklists: Record<string, ChecklistItem[]>;
  addChecklistItem: (targetId: string, title: string) => void;
  toggleChecklistItem: (targetId: string, itemId: string) => void;
  /** время сфер в ежедневном расписании */
  sphereSlots: Partial<Record<SphereId, SphereSlot>>;
  /** null — убрать сферу из расписания */
  setSphereSlot: (sphere: SphereId, slot: SphereSlot | null) => void;
  prayersDone: Record<string, boolean>;
  /** отметки намазов по датам: { 'YYYY-MM-DD': { fajr: true } } */
  prayersByDate: Record<string, Record<string, boolean>>;
  togglePrayer: (prayerId: string) => void;
  setTaskStatus: (id: string, status: Task['status']) => void;
  toggleHabit: (id: string) => void;
  addHabit: (input: string | NewHabit) => void;
  saveJournal: (entry: Omit<JournalEntry, 'id' | 'date' | 'label'>) => void;
  getSphere: (id: Sphere['id']) => Sphere;
  tasksForPeriod: (periodId: Period['id']) => Task[];
  syncStatus: SyncStatus;
  /** сохраняет несохранённое, очищает состояние и выходит из аккаунта */
  logout: () => Promise<void>;
}

interface AppProviderProps {
  children: React.ReactNode;
  userId: string;
  initial: UserSnapshot;
  /** локальная копия новее облачной — отправить сразу */
  needsUpload: boolean;
  /** данные загружены с устройства без сети */
  offline: boolean;
}

const AppContext = createContext<AppState | null>(null);

const SAVE_DELAY = 1500;

/** Подпись записи дневника относительно сегодняшнего дня */
function journalLabel(date: string, today: string): string {
  const diff = differenceInCalendarDays(parseISO(today), parseISO(date));
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Вчера';
  return format(parseISO(date), 'd MMMM', { locale: ru });
}

export function AppProvider({ children, userId, initial, needsUpload, offline }: AppProviderProps) {
  const live = useLive();
  const { signOut } = useAuth();

  const [tasks, setTasks] = useState<Task[]>(initial.tasks);
  const [habits, setHabits] = useState<Habit[]>(() =>
  initial.habits.map((h) => rollHabit(h, live.todayISO))
  );
  const [goals, setGoals] = useState<Goal[]>(initial.goals);
  const [journalRaw, setJournal] = useState<JournalEntry[]>(initial.journal);
  const [checklists, setChecklists] = useState<Record<string, ChecklistItem[]>>(initial.checklists);
  const [prayersByDate, setPrayersByDate] = useState<Record<string, Record<string, boolean>>>(
    initial.prayersByDate
  );
  const [sections, setSections] = useState<Section[]>(initial.sections);
  const [sphereSlots, setSphereSlots] = useState<Partial<Record<SphereId, SphereSlot>>>(
    initial.sphereSlots
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(offline ? 'offline' : 'saved');

  const prayersDone = useMemo(
    () => prayersByDate[live.todayISO] ?? {},
    [prayersByDate, live.todayISO]
  );

  const journal = useMemo(
    () => journalRaw.map((e) => ({ ...e, label: journalLabel(e.date, live.todayISO) })),
    [journalRaw, live.todayISO]
  );

  /* ---------- сохранение ---------- */

  const snapshot = useMemo<UserSnapshot>(
    () => ({
      version: 1,
      tasks,
      sections,
      habits,
      goals,
      journal: journalRaw,
      checklists,
      prayersByDate,
      sphereSlots
    }),
    [tasks, sections, habits, goals, journalRaw, checklists, prayersByDate, sphereSlots]
  );

  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const dirtyRef = useRef(needsUpload);
  const timerRef = useRef<number | undefined>(undefined);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const closingRef = useRef(false);
  const firstRenderRef = useRef(true);

  /** сохраняет последнюю версию; сохранения идут строго по очереди */
  const flush = useCallback((): Promise<void> => {
    window.clearTimeout(timerRef.current);
    queueRef.current = queueRef.current.then(async () => {
      if (!dirtyRef.current) return;
      dirtyRef.current = false;
      setSyncStatus('saving');
      const ok = await saveUserData(userId, snapshotRef.current);
      if (!ok) {
        // повторим при следующем изменении или когда появится сеть
        dirtyRef.current = true;
        setSyncStatus('offline');
      } else if (!dirtyRef.current) {
        setSyncStatus('saved');
      }
    });
    return queueRef.current;
  }, [userId]);

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      if (dirtyRef.current) timerRef.current = window.setTimeout(() => void flush(), SAVE_DELAY);
      return;
    }
    if (closingRef.current) return;
    dirtyRef.current = true;
    setSyncStatus('saving');
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => void flush(), SAVE_DELAY);
  }, [snapshot, flush]);

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden' && !closingRef.current) void flush();
    };
    const onPageHide = () => {
      if (!closingRef.current) void flush();
    };
    const onOnline = () => {
      if (dirtyRef.current && !closingRef.current) void flush();
    };
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('online', onOnline);
      window.clearTimeout(timerRef.current);
    };
  }, [flush]);

  const logout = useCallback(async () => {
    // дожидаемся последнего сохранения, но не дольше 3 секунд
    await Promise.race([flush(), new Promise<void>((r) => window.setTimeout(r, 3000))]);
    closingRef.current = true;
    window.clearTimeout(timerRef.current);
    dirtyRef.current = false;
    setTasks([]);
    setHabits([]);
    setGoals([]);
    setJournal([]);
    setChecklists({});
    setPrayersByDate({});
    setSections([]);
    setSphereSlots({});
    try {
      window.history.replaceState(null, '', '/');
    } catch {

      /* без истории — не страшно */}
    await signOut();
  }, [flush, signOut]);

  /* ---------- смена дня для привычек ---------- */

  useEffect(() => {
    setHabits((prev) => {
      let changed = false;
      const next = prev.map((h) => {
        const rolled = rollHabit(h, live.todayISO);
        if (rolled !== h) changed = true;
        return rolled;
      });
      return changed ? next : prev;
    });
  }, [live.todayISO, live.minutes]);

  /* ---------- данные ---------- */

  const addSection = useCallback((sphere: SphereId, title: string): string => {
    const id = `s${Date.now()}`;
    setSections((prev) => [...prev, { id, sphere, title }]);
    return id;
  }, []);

  /** до Фаджра текущим считается Иша предыдущего дня, период — «после Иша» */
  const { currentPrayer, nextPrayer, currentPeriod } = useMemo(() => {
    const state = getPrayerState(live.minutes);
    const index = currentPeriodIndex(live.minutes);
    return {
      currentPrayer: state.current,
      nextPrayer: state.next,
      currentPeriod: live.periods[Math.min(index, live.periods.length - 1)]
    };
  }, [live.minutes, live.periods, live.prayers]);

  const fallbackPeriodRef = useRef<PeriodId>(currentPeriod.id);
  fallbackPeriodRef.current = currentPeriod.id;

  const addTask = useCallback(({ parallelWithId, ...task }: NewTask): string => {
    const id = `t${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
    setTasks((prev) => {
      const partner = parallelWithId ? prev.find((t) => t.id === parallelWithId) : undefined;
      const group = partner ? partner.parallelGroup ?? `pg${Date.now()}` : undefined;
      const updated = partner ?
      prev.map((t) => t.id === partner.id ? { ...t, parallelGroup: group } : t) :
      prev;
      const sphere = task.sphere ?? 'other';
      const period = periodForTime(task.time, task.period ?? fallbackPeriodRef.current);
      return [
      ...updated,
      {
        order: Date.now(),
        ...task,
        sphere,
        period,
        sectionId: task.sectionId || undefined,
        date: task.date || undefined,
        parallelGroup: group,
        id,
        status: 'open' as const
      }];

    });
    return id;
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Omit<Task, 'id'>>) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...patch } : t));
  }, []);

  const addChecklistItem = useCallback((targetId: string, title: string) => {
    setChecklists((prev) => ({
      ...prev,
      [targetId]: [
      ...(prev[targetId] ?? []),
      { id: `c${Date.now()}${Math.random().toString(36).slice(2, 7)}`, title, done: false }]

    }));
  }, []);

  const toggleChecklistItem = useCallback((targetId: string, itemId: string) => {
    setChecklists((prev) => ({
      ...prev,
      [targetId]: (prev[targetId] ?? []).map((i) =>
      i.id === itemId ? { ...i, done: !i.done } : i
      )
    }));
  }, []);

  const togglePrayer = useCallback((prayerId: string) => {
    const date = todayISO();
    setPrayersByDate((prev) => {
      const day = prev[date] ?? {};
      return { ...prev, [date]: { ...day, [prayerId]: !day[prayerId] } };
    });
  }, []);

  const setSphereSlot = useCallback((sphere: SphereId, slot: SphereSlot | null) => {
    setSphereSlots((prev) => {
      const next = { ...prev };
      if (slot) next[sphere] = slot;else
      delete next[sphere];
      return next;
    });
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => {
      const removed = new Set([id]);
      let grew = true;
      while (grew) {
        grew = false;
        prev.forEach((t) => {
          if (t.parentId && removed.has(t.parentId) && !removed.has(t.id)) {
            removed.add(t.id);
            grew = true;
          }
        });
      }
      return prev.filter((t) => !removed.has(t.id));
    });
  }, []);

  const reorderTasks = useCallback((ids: string[]) => {
    setTasks((prev) =>
    prev.map((t) => {
      const index = ids.indexOf(t.id);
      return index === -1 ? t : { ...t, order: index };
    })
    );
  }, []);

  const toggleTask = useCallback((id: string) => {
    const d = new Date();
    const stamp = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    setTasks((prev) =>
    prev.map((t) =>
    t.id === id ?
    t.status === 'done' ?
    { ...t, status: 'open', completedAt: undefined } :
    { ...t, status: 'done', completedAt: stamp } :
    t
    )
    );
  }, []);

  const setTaskStatus = useCallback((id: string, status: Task['status']) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
  }, []);

  const toggleHabit = useCallback((id: string) => {
    const today = todayISO();
    setHabits((prev) => prev.map((h) => h.id === id ? toggleHabitToday(h, today) : h));
  }, []);

  const addHabit = useCallback((input: string | NewHabit) => {
    const fields: NewHabit = typeof input === 'string' ? { title: input } : input;
    const title = fields.title.trim();
    if (!title) return;
    setHabits((prev) => [
    ...prev,
    {
      ...fields,
      id: `h${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      title,
      streak: 0,
      bestStreak: 0,
      doneToday: false,
      completedCount: 0,
      history: new Array<number>(HISTORY_DAYS).fill(0),
      historyDate: todayISO()
    }]
    );
  }, []);

  const saveJournal = useCallback((entry: Omit<JournalEntry, 'id' | 'date' | 'label'>) => {
    const date = todayISO();
    setJournal((prev) => {
      if (prev.some((e) => e.date === date)) {
        return prev.map((e) => e.date === date ? { ...e, ...entry } : e);
      }
      return [{ id: `j${Date.now()}`, date, label: 'Сегодня', ...entry }, ...prev];
    });
  }, []);

  const getSphere = useCallback(
    (id: Sphere['id']) => spheres.find((s) => s.id === id) ?? spheres[spheres.length - 1],
    []
  );

  const tasksForPeriod = useCallback(
    (periodId: Period['id']) =>
    tasks.filter((t) => t.period === periodId && t.date === live.todayISO),
    [tasks, live.todayISO]
  );

  const value: AppState = {
    now: fromMinutes(live.minutes),
    tasks,
    habits,
    goals,
    journal,
    currentPrayer,
    nextPrayer,
    currentPeriod,
    addTask,
    sections,
    addSection,
    updateTask,
    deleteTask,
    reorderTasks,
    toggleTask,
    checklists,
    addChecklistItem,
    toggleChecklistItem,
    sphereSlots,
    setSphereSlot,
    prayersDone,
    prayersByDate,
    togglePrayer,
    setTaskStatus,
    toggleHabit,
    addHabit,
    saveJournal,
    getSphere,
    tasksForPeriod,
    syncStatus,
    logout
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}