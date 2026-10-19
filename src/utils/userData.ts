import { supabase } from '../lib/supabase';
import type {
  ChecklistItem,
  Goal,
  Habit,
  JournalEntry,
  Section,
  SphereId,
  SphereSlot,
  Task } from
'../types';

/** Всё, что принадлежит пользователю и сохраняется в облаке */
export interface UserSnapshot {
  version: 1;
  tasks: Task[];
  sections: Section[];
  habits: Habit[];
  goals: Goal[];
  journal: JournalEntry[];
  checklists: Record<string, ChecklistItem[]>;
  prayersByDate: Record<string, Record<string, boolean>>;
  /** время сфер в ежедневном расписании; в старых снимках поля нет */
  sphereSlots: Partial<Record<SphereId, SphereSlot>>;
}

interface StoredSnapshot {
  data: UserSnapshot;
  updatedAt: string;
}

export interface LoadedUserData {
  snapshot: UserSnapshot;
  /** локальная копия новее облачной — её нужно отправить */
  needsUpload: boolean;
  /** облако недоступно, данные взяты с устройства */
  offline: boolean;
}

/** id раздела из старых снимков; его задачи переезжают в сферу «Прочее» */
const LEGACY_OTHER_SECTION = 'other-section';

export const emptySnapshot = (): UserSnapshot => ({
  version: 1,
  tasks: [],
  sections: [],
  habits: [],
  goals: [],
  journal: [],
  checklists: {},
  prayersByDate: {},
  sphereSlots: {}
});

const cacheKey = (userId: string) => `sirahdo.data.${userId}`;

const isRecord = (v: unknown): v is Record<string, unknown> =>
typeof v === 'object' && v !== null && !Array.isArray(v);

const arr = <T,>(v: unknown): T[] => Array.isArray(v) ? v as T[] : [];

/** Оставляет только корректные слоты: «HH:MM» и положительная длительность */
function normalizeSlots(raw: unknown): Partial<Record<SphereId, SphereSlot>> {
  if (!isRecord(raw)) return {};
  const slots: Partial<Record<SphereId, SphereSlot>> = {};
  Object.entries(raw).forEach(([sphere, slot]) => {
    if (
    isRecord(slot) &&
    typeof slot.start === 'string' &&
    /^\d{2}:\d{2}$/.test(slot.start) &&
    typeof slot.duration === 'number' &&
    slot.duration > 0)
    {
      slots[sphere as SphereId] = { start: slot.start, duration: slot.duration };
    }
  });
  return slots;
}

/** Защищает приложение от повреждённых или неполных данных */
function normalize(raw: unknown): UserSnapshot | null {
  if (!isRecord(raw)) return null;
  const sections = arr<Section>(raw.sections).filter((s) => s && s.id !== LEGACY_OTHER_SECTION);
  const tasks = arr<Task>(raw.tasks).
  filter((t) => isRecord(t) && typeof t.id === 'string').
  map((t) => {
    let next: Task = t;
    if (t.sectionId === LEGACY_OTHER_SECTION) {
      next = { ...next, sphere: 'other', sectionId: undefined };
    }
    if (!next.period) next = { ...next, period: 'untilDhuhr' };
    if (!next.sphere) next = { ...next, sphere: 'other' };
    if (typeof next.date === 'string' && next.date.trim() === '') next = { ...next, date: undefined };
    return next;
  });
  return {
    version: 1,
    tasks,
    sections,
    habits: arr<Habit>(raw.habits).map((h) => ({ ...h, history: arr<number>(h.history) })),
    goals: arr<Goal>(raw.goals),
    journal: arr<JournalEntry>(raw.journal),
    checklists: isRecord(raw.checklists) ?
    raw.checklists as Record<string, ChecklistItem[]> :
    {},
    prayersByDate: isRecord(raw.prayersByDate) ?
    raw.prayersByDate as Record<string, Record<string, boolean>> :
    {},
    sphereSlots: normalizeSlots(raw.sphereSlots)
  };
}

function readCache(userId: string): StoredSnapshot | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || typeof parsed.updatedAt !== 'string') return null;
    const data = normalize(parsed.data);
    return data ? { data, updatedAt: parsed.updatedAt } : null;
  } catch {
    return null;
  }
}

function writeCache(userId: string, stored: StoredSnapshot): void {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(stored));
  } catch {

    /* хранилище недоступно или переполнено — облако остаётся основным */}
}

const time = (iso: string | undefined | null): number => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? 0 : t;
};

/**
 * Загружает данные пользователя: облако и локальная копия, побеждает более свежая.
 * null — облако недоступно и на устройстве ничего нет (стартовать с пустых данных нельзя,
 * иначе они перезапишут облачные).
 */
export async function loadUserData(userId: string): Promise<LoadedUserData | null> {
  const cache = readCache(userId);
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 10000);
  try {
    const { data, error } = await supabase.
    from('user_data').
    select('data, updated_at').
    eq('user_id', userId).
    abortSignal(controller.signal).
    maybeSingle();
    if (error) throw error;

    const cloud = data ? normalize(data.data) : null;
    const cloudAt = data ? data.updated_at as string | null : null;

    if (cloud && cache) {
      return time(cache.updatedAt) > time(cloudAt) ?
      { snapshot: cache.data, needsUpload: true, offline: false } :
      { snapshot: cloud, needsUpload: false, offline: false };
    }
    if (cloud) return { snapshot: cloud, needsUpload: false, offline: false };
    if (cache) return { snapshot: cache.data, needsUpload: true, offline: false };
    return { snapshot: emptySnapshot(), needsUpload: false, offline: false };
  } catch {
    return cache ? { snapshot: cache.data, needsUpload: true, offline: true } : null;
  } finally {
    window.clearTimeout(timer);
  }
}

/** Сохраняет снимок на устройство и в облако. false — облако недоступно */
export async function saveUserData(userId: string, snapshot: UserSnapshot): Promise<boolean> {
  const updatedAt = new Date().toISOString();
  writeCache(userId, { data: snapshot, updatedAt });
  try {
    const { error } = await supabase.
    from('user_data').
    upsert({ user_id: userId, data: snapshot, updated_at: updatedAt });
    return !error;
  } catch {
    return false;
  }
}