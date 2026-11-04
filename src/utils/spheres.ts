import {
  BUILTIN_SPHERES,
  COLOR_KEYS,
  DEFAULT_COLOR,
  DEFAULT_ICON,
  ICON_KEYS,
  MAX_CUSTOM_SPHERES,
  OTHER_SPHERE_ID,
  SPHERE_COLORS,
  SPHERE_NAME_MAX } from
'../data/spheres';
import type { ColorKey, IconKey } from '../data/spheres';
import type { CustomSphere, Section, Sphere, SphereSlot, Task } from '../types';

/** Пользовательская сфера в общем виде */
export const toSphere = (c: CustomSphere): Sphere => ({
  id: c.id,
  name: c.name,
  icon: c.icon,
  color: SPHERE_COLORS[c.color]
});

/** Все сферы: встроенные, затем пользовательские по order */
export function mergeSpheres(custom: CustomSphere[] = []): Sphere[] {
  return [...BUILTIN_SPHERES, ...[...custom].sort((a, b) => a.order - b.order).map(toSphere)];
}

const other = BUILTIN_SPHERES.find((s) => s.id === OTHER_SPHERE_ID) as Sphere;

/** Сфера по id; неизвестная (например, удалённая) — «Прочее», данные дела не трогаются */
export function resolveSphere(list: Sphere[], id: string | undefined): Sphere {
  return list.find((s) => s.id === id) ?? other;
}

export const isBuiltinSphere = (id: string) => BUILTIN_SPHERES.some((s) => s.id === id);

export interface SphereInput {
  name: string;
  icon: IconKey;
  color: ColorKey;
}

export type SphereRefusal = 'empty' | 'duplicate' | 'limit' | 'builtin' | 'missing';

export const sphereRefusalText: Record<SphereRefusal, string> = {
  empty: 'Введите название',
  duplicate: 'Такая сфера уже есть',
  limit: `Можно создать не больше ${MAX_CUSTOM_SPHERES} сфер`,
  builtin: 'Встроенную сферу изменить нельзя',
  missing: 'Сфера не найдена'
};

/** Название: без пробелов по краям, не длиннее 24 символов */
export const cleanSphereName = (name: string) => name.trim().replace(/\s+/g, ' ').slice(0, SPHERE_NAME_MAX).trim();

/** Проверка названия: пустое нельзя, повтор (без учёта регистра) со встроенной или своей — нельзя */
export function checkSphereName(name: string, custom: CustomSphere[], exceptId?: string): SphereRefusal | null {
  const clean = cleanSphereName(name);
  if (!clean) return 'empty';
  const lower = clean.toLocaleLowerCase('ru');
  const taken = mergeSpheres(custom).some((s) => s.id !== exceptId && s.name.toLocaleLowerCase('ru') === lower);
  return taken ? 'duplicate' : null;
}

export type SphereResult = {ok: true;custom: CustomSphere[];id: string;} | {ok: false;reason: SphereRefusal;};

const randomId = () => `c_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;

export function createSphere(custom: CustomSphere[], input: SphereInput, now = new Date(), makeId = randomId): SphereResult {
  if (custom.length >= MAX_CUSTOM_SPHERES) return { ok: false, reason: 'limit' };
  const reason = checkSphereName(input.name, custom);
  if (reason) return { ok: false, reason };
  let id = makeId();
  while (custom.some((c) => c.id === id) || isBuiltinSphere(id)) id = makeId();
  const sphere: CustomSphere = {
    id,
    name: cleanSphereName(input.name),
    icon: input.icon,
    color: input.color,
    order: custom.reduce((max, c) => Math.max(max, c.order), -1) + 1,
    createdAt: now.toISOString()
  };
  return { ok: true, custom: [...custom, sphere], id };
}

export function updateSphere(custom: CustomSphere[], id: string, input: SphereInput): SphereResult {
  if (isBuiltinSphere(id)) return { ok: false, reason: 'builtin' };
  if (!custom.some((c) => c.id === id)) return { ok: false, reason: 'missing' };
  const reason = checkSphereName(input.name, custom, id);
  if (reason) return { ok: false, reason };
  return {
    ok: true,
    id,
    custom: custom.map((c) => c.id === id ? { ...c, name: cleanSphereName(input.name), icon: input.icon, color: input.color } : c)
  };
}

export interface SphereData {
  custom: CustomSphere[];
  tasks: Task[];
  sections: Section[];
  sphereSlots: Partial<Record<string, SphereSlot>>;
}

/**
 * Удаляет пользовательскую сферу. Дела не удаляются: они и разделы (с теми же названиями)
 * переезжают в «Прочее».
 */
export function deleteSphere(data: SphereData, id: string): SphereData | null {
  if (isBuiltinSphere(id) || !data.custom.some((c) => c.id === id)) return null;
  const slots = { ...data.sphereSlots };
  delete slots[id];
  return {
    custom: data.custom.filter((c) => c.id !== id),
    tasks: data.tasks.map((t) => t.sphere === id ? { ...t, sphere: OTHER_SPHERE_ID } : t),
    sections: data.sections.map((s) => s.sphere === id ? { ...s, sphere: OTHER_SPHERE_ID } : s),
    sphereSlots: slots
  };
}

/** Сколько дел и разделов переедет в «Прочее» */
export function sphereContents(data: Pick<SphereData, 'tasks' | 'sections'>, id: string) {
  return {
    tasks: data.tasks.filter((t) => t.sphere === id && t.status !== 'cancelled').length,
    sections: data.sections.filter((s) => s.sphere === id).length
  };
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Пользовательские сферы из сохранённых данных: без id или названия — отбрасываются,
 * неизвестные иконка и цвет — по умолчанию, повторы id и названий — отбрасываются,
 * больше 12 — лишние не читаются. Старые данные без поля — пустой список.
 */
export function normalizeCustomSpheres(raw: unknown): CustomSphere[] {
  if (!Array.isArray(raw)) return [];
  const out: CustomSphere[] = [];
  raw.forEach((r, index) => {
    if (!isRecord(r) || typeof r.id !== 'string' || !/^c_[A-Za-z0-9_-]+$/.test(r.id)) return;
    if (typeof r.name !== 'string') return;
    const name = cleanSphereName(r.name);
    if (!name || out.some((c) => c.id === r.id) || checkSphereName(name, out) !== null) return;
    out.push({
      id: r.id,
      name,
      icon: ICON_KEYS.includes(r.icon as IconKey) ? r.icon as IconKey : DEFAULT_ICON,
      color: COLOR_KEYS.includes(r.color as ColorKey) ? r.color as ColorKey : DEFAULT_COLOR,
      order: typeof r.order === 'number' && Number.isFinite(r.order) ? r.order : index,
      createdAt: typeof r.createdAt === 'string' ? r.createdAt : ''
    });
  });
  return out.slice(0, MAX_CUSTOM_SPHERES);
}
