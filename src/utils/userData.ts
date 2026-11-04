import { supabase } from '../lib/supabase';
import type {
  ChecklistItem,
  CustomSphere,
  Goal,
  Habit,
  JournalEntry,
  Section,
  SphereId,
  SphereSlot,
  Task } from
'../types';
import { prunePlacement } from './blockPlacement';
import type { BlockPlacement } from './blockPlacement';
import { todayISO } from './prayer';
import { normalizeCustomSpheres } from './spheres';
import { pruneDoneDates } from './occurrence';
import { isPrayerId } from '../data/appData';
import { migratePrayerItems } from './prayerMigration';

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
  /** перенесённые на «Сегодня» блоки «Удел»/«Прочее» по датам; в старых снимках поля нет */
  blockPlacement?: BlockPlacement;
  /** сферы, созданные пользователем; в старых снимках поля нет */
  customSpheres?: CustomSphere[];
  /** старые пункты намазов уже превращены в задачи (один раз) */
  prayerItemsMigrated?: boolean;
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

/**
 * Пункты дел и намазов: битые записи выбрасываются, недостающее дополняется по умолчанию.
 * parentId и note необязательны — старые пункты без них остаются как есть.
 */
function normalizeChecklists(raw: unknown): Record<string, ChecklistItem[]> {
  if (!isRecord(raw)) return {};
  const out: Record<string, ChecklistItem[]> = {};
  Object.entries(raw).forEach(([targetId, list]) => {
    out[targetId] = arr<unknown>(list).
    filter((i): i is Record<string, unknown> => isRecord(i) && typeof i.id === 'string').
    map((i) => {
      const item: ChecklistItem = {
        ...(i as unknown as ChecklistItem),
        title: typeof i.title === 'string' ? i.title : '',
        done: i.done === true
      };
      if (typeof i.parentId !== 'string') delete item.parentId;
      if (typeof i.note !== 'string') delete item.note;
      return item;
    });
  });
  return out;
}

/** Защищает приложение от повреждённых или неполных данных */
/** Чтение данных: нормализация и однократная миграция пунктов намазов в задачи */
export function normalize(raw: unknown): UserSnapshot | null {
  const snap = normalizeRaw(raw);
  return snap ? migratePrayerItems(snap, todayISO()) : null;
}

function normalizeRaw(raw: unknown): UserSnapshot | null {
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
    if ('prayerId' in next && !isPrayerId(next.prayerId)) {
      next = { ...next };
      delete next.prayerId;
    }
    if ('doneDates' in next) {
      // отметки вхождений повторов: только корректные даты не старше 60 дней
      const doneDates = pruneDoneDates(next.doneDates, todayISO());
      next = { ...next };
      if (doneDates) next.doneDates = doneDates;else
      delete next.doneDates;
    }
    return next;
  });
  return {
    version: 1,
    tasks,
    sections,
    habits: arr<Habit>(raw.habits).map((h) => ({ ...h, history: arr<number>(h.history) })),
    goals: arr<Goal>(raw.goals),
    journal: arr<JournalEntry>(raw.journal),
    checklists: normalizeChecklists(raw.checklists),
    prayersByDate: isRecord(raw.prayersByDate) ?
    raw.prayersByDate as Record<string, Record<string, boolean>> :
    {},
    sphereSlots: normalizeSlots(raw.sphereSlots),
    // действует только сегодня; записи старше 7 дней чистятся
    blockPlacement: prunePlacement(raw.blockPlacement, todayISO()),
    customSpheres: normalizeCustomSpheres(raw.customSpheres),
    prayerItemsMigrated: raw.prayerItemsMigrated === true
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