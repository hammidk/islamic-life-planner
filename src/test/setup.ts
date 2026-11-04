import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { buildSnapshot, setLiveSnapshot } from '../utils/live';
import type { LiveSnapshot } from '../utils/live';

/* Тесты не ходят в сеть: облако, вход и живые данные — заглушки */

vi.mock('../utils/userData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/userData')>();
  return { ...actual, saveUserData: vi.fn(async () => true), loadUserData: vi.fn(async () => null) };
});

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user' }, loading: false, signOut: async () => {} }),
  useCurrentUser: () => ({ name: 'Тест', email: 'test@example.com', initial: 'Т' }),
  AuthProvider: ({ children }: {children: unknown;}) => children
}));

export const TEST_TODAY = '2026-11-03';

const liveFor = (todayISO: string, minutes: number): LiveSnapshot => buildSnapshot({
  location: { city: 'Тест', lat: 0, lon: 0, tz: 'UTC', confirmed: true } as LiveSnapshot['location'],
  todayISO,
  minutes,
  timings: {
    fajr: '06:18',
    sunrise: '07:50',
    dhuhr: '12:40',
    asr: '15:05',
    maghrib: '17:20',
    isha: '18:50',
    lastthird: '03:24'
  },
  status: 'ready'
});

export const testLive: LiveSnapshot = liveFor(TEST_TODAY, 10 * 60);
setLiveSnapshot(testLive);

/**
 * Переводит «сегодня» приложения (живые данные) и системные часы на другую дату.
 * После теста всё возвращается к TEST_TODAY.
 */
export function setTestDay(iso: string, minutes = 10 * 60): void {
  Object.assign(testLive, liveFor(iso, minutes));
  setLiveSnapshot(testLive);
  vi.setSystemTime(new Date(`${iso}T${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00`));
}

vi.mock('../contexts/LiveDataContext', () => ({
  useLive: () => ({
    ...testLive,
    locating: false,
    weather: null,
    prayerConfig: {},
    setPrayerConfig: () => {},
    setLocation: () => {},
    confirmLocation: () => {},
    openLocationPicker: () => {},
    retry: () => {}
  }),
  LiveDataProvider: ({ children }: {children: unknown;}) => children
}));

/* jsdom не умеет того, что используют framer-motion и прокрутка */
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  }) as MediaQueryList;
}
window.scrollTo = (() => {}) as typeof window.scrollTo;
Element.prototype.scrollIntoView = () => {};
Element.prototype.scrollTo = (() => {}) as Element['scrollTo'];
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// минимальные заглушки для jsdom
const w = window as unknown as Record<string, unknown>;
w.ResizeObserver = w.ResizeObserver ?? NoopObserver;
w.IntersectionObserver = w.IntersectionObserver ?? NoopObserver;

afterEach(() => {
  cleanup();
  Object.assign(testLive, liveFor(TEST_TODAY, 10 * 60));
  setLiveSnapshot(testLive);
  vi.useRealTimers();
  try {
    localStorage.clear();
  } catch {

    /* нет хранилища */}
});
