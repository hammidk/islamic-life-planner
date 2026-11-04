import { useSyncExternalStore } from 'react';

export interface Toast {
  id: number;
  text: string;
  action?: {label: string;run: () => void;};
  /** мс */
  duration: number;
}

/** Один тост за раз: новый заменяет предыдущий */
let current: Toast | null = null;
let sequence = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export function showToast(text: string, action?: Toast['action'], duration = action ? 5000 : 2200): void {
  sequence += 1;
  current = { id: sequence, text, action, duration };
  clearTimeout(timer);
  const id = sequence;
  timer = setTimeout(() => {
    if (current?.id === id) dismissToast();
  }, duration);
  emit();
}

export function dismissToast(): void {
  clearTimeout(timer);
  current = null;
  emit();
}

export function useToast(): Toast | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => null
  );
}
