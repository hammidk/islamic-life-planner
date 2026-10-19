import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface AuthResult {
  error: string | null;
  /** аккаунт создан, но нужно подтвердить email */
  needsConfirmation?: boolean;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const NETWORK_ERROR = 'Нет соединения с интернетом. Проверьте сеть и попробуйте ещё раз.';

/** Человеческие сообщения вместо технических ошибок Supabase */
function translateAuthError(error: {message?: string;code?: string;status?: number;}): string {
  const message = (error.message ?? '').toLowerCase();
  const code = error.code ?? '';
  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return 'Неверный email или пароль.';
  }
  if (
  code === 'user_already_exists' ||
  code === 'email_exists' ||
  message.includes('already registered') ||
  message.includes('already been registered'))
  {
    return 'Этот email уже зарегистрирован. Попробуйте войти.';
  }
  if (code === 'weak_password' || message.includes('password should') || message.includes('weak')) {
    return 'Слишком простой пароль. Используйте не меньше 6 символов, лучше с цифрами и буквами.';
  }
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return 'Email ещё не подтверждён. Откройте письмо от нас и перейдите по ссылке.';
  }
  if (code === 'email_address_invalid' || message.includes('invalid') && message.includes('email')) {
    return 'Проверьте адрес email.';
  }
  if (code.includes('rate_limit') || error.status === 429 || message.includes('rate limit')) {
    return 'Слишком много попыток. Подождите немного и попробуйте снова.';
  }
  if (
  message.includes('fetch') ||
  message.includes('network') ||
  message.includes('load failed') ||
  typeof navigator !== 'undefined' && !navigator.onLine)
  {
    return NETWORK_ERROR;
  }
  return 'Что-то пошло не так. Попробуйте ещё раз.';
}

export function AuthProvider({ children }: {children: React.ReactNode;}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    // один и тот же пользователь — тот же объект, чтобы не перерисовывать приложение на обновлении токена
    const apply = (next: User | null) =>
    setUser((prev) =>
    prev && next && prev.id === next.id && prev.updated_at === next.updated_at ? prev : next
    );

    supabase.auth.
    getSession().
    then(({ data }) => {
      if (!active) return;
      apply(data.session?.user ?? null);
      setLoading(false);
    }).
    catch(() => {
      if (active) setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      apply(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, password: string): Promise<AuthResult> => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } }
        });
        if (error) return { error: translateAuthError(error) };
        // при включённом подтверждении email Supabase не сообщает о занятом адресе явно
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          return { error: 'Этот email уже зарегистрирован. Попробуйте войти.' };
        }
        if (!data.session) return { error: null, needsConfirmation: true };
        return { error: null };
      } catch {
        return { error: NETWORK_ERROR };
      }
    },
    []
  );

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ? translateAuthError(error) : null };
    } catch {
      return { error: NETWORK_ERROR };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {

      /* даже без сети выходим локально */} finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>);

}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Имя и email текущего пользователя для отображения */
export function useCurrentUser(): {name: string;email: string;initial: string;} {
  const { user } = useAuth();
  const email = user?.email ?? '';
  const fullName: unknown = user?.user_metadata?.full_name;
  const name =
  typeof fullName === 'string' && fullName.trim() ? fullName.trim() : email.split('@')[0] ?? '';
  return { name, email, initial: (name.charAt(0) || '•').toUpperCase() };
}