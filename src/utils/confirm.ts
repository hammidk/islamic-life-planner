import { useSyncExternalStore } from 'react';

export interface ConfirmRequest {
  title: string;
  confirmLabel: string;
  resolve: (ok: boolean) => void;
}

/** Подтверждение действия (лист снизу); один запрос за раз */
let current: ConfirmRequest | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function askConfirm(title: string, confirmLabel = 'Удалить'): Promise<boolean> {
  current?.resolve(false);
  return new Promise((resolve) => {
    current = {
      title,
      confirmLabel,
      resolve: (ok) => {
        current = null;
        emit();
        resolve(ok);
      }
    };
    emit();
  });
}

export function useConfirmRequest(): ConfirmRequest | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => null
  );
}
