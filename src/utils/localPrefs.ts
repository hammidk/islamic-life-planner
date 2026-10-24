import { useCallback, useState } from 'react';

/** Настройки интерфейса на этом устройстве; без хранилища (приватный режим) просто не запоминаются */
export function readPref<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writePref(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {

    /* хранилище недоступно — состояние живёт до перезагрузки */}
}

/** Свёрнут/развёрнут, с запоминанием на устройстве */
export function usePersistentFlag(key: string, fallback: boolean): [boolean, () => void] {
  const [value, setValue] = useState(() => readPref(key, fallback));
  const toggle = useCallback(() => {
    setValue((prev) => {
      writePref(key, !prev);
      return !prev;
    });
  }, [key]);
  return [value, toggle];
}
