import React, { useEffect, useState } from 'react';
import { AppProvider } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from './LoadingScreen';
import { loadUserData } from '../utils/userData';
import type { LoadedUserData } from '../utils/userData';

type GateState =
{kind: 'loading';} |
{kind: 'error';} |
{kind: 'ready';data: LoadedUserData;};

/**
 * Загружает данные пользователя до показа приложения.
 * Пока загрузка не завершена, AppProvider не создаётся — пустое состояние не может перезаписать облако.
 */
export function UserDataGate({ userId, children }: {userId: string;children: React.ReactNode;}) {
  const { signOut } = useAuth();
  const [state, setState] = useState<GateState>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });
    loadUserData(userId).then((data) => {
      if (cancelled) return;
      setState(data ? { kind: 'ready', data } : { kind: 'error' });
    });
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  if (state.kind === 'loading') return <LoadingScreen label="Загружаем ваши данные…" />;

  if (state.kind === 'error') {
    return (
      <div className="flex min-h-screen w-full justify-center bg-[#ECEEEA] font-sans antialiased">
        <div className="flex min-h-screen w-full max-w-[430px] flex-col items-center justify-center bg-canvas px-8 text-center">
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-ink">
            Не удалось загрузить данные
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            Нет соединения с интернетом. Проверьте сеть — ваши дела в безопасности в облаке.
          </p>
          <button
            type="button"
            onClick={() => setAttempt((a) => a + 1)}
            className="mt-6 w-full rounded-2xl bg-primary py-3.5 text-[15px] font-medium text-white transition-transform duration-150 ease-out active:scale-[0.99]">
            
            Повторить
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-2 w-full rounded-2xl py-3 text-[14px] text-muted transition-colors duration-150 ease-out hover:text-ink-soft">
            
            Выйти из аккаунта
          </button>
        </div>
      </div>);

  }

  return (
    <AppProvider
      key={userId}
      userId={userId}
      initial={state.data.snapshot}
      needsUpload={state.data.needsUpload}
      offline={state.data.offline}>
      
      {children}
    </AppProvider>);

}