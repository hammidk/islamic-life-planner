import React, { useState } from 'react';
import { EyeIcon, EyeOffIcon, LoaderIcon } from 'lucide-react';
import { SegmentedControl } from '../components/SegmentedControl';
import { useAuth } from '../contexts/AuthContext';

type Mode = 'signIn' | 'signUp';

const MIN_PASSWORD = 6;

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isSignUp = mode === 'signUp';

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const validate = (): string | null => {
    if (isSignUp && !name.trim()) return 'Как к вам обращаться? Укажите имя.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Проверьте адрес email.';
    if (password.length < MIN_PASSWORD) return `Пароль должен быть не короче ${MIN_PASSWORD} символов.`;
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = isSignUp ?
    await signUp(name.trim(), email.trim(), password) :
    await signIn(email.trim(), password);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.needsConfirmation) {
      setMode('signIn');
      setPassword('');
      setNotice(`Мы отправили письмо на ${email.trim()}. Подтвердите адрес и войдите.`);
    }
  };

  const inputClass =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-[11px] text-[16px] text-ink placeholder:text-muted/70 transition-colors duration-150 ease-out focus:border-primary/50 focus:outline-none';

  return (
    <div className="flex min-h-screen w-full justify-center bg-[#ECEEEA] font-sans text-ink antialiased">
      <main className="flex min-h-screen w-full max-w-[430px] flex-col bg-canvas px-5 pb-10 pt-16">
        <header className="mb-8 px-1">
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.015em] text-ink">
            {isSignUp ? 'Создать аккаунт' : 'Ассаляму алейкум'}
          </h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-muted">
            {isSignUp ?
            'Аккаунт нужен, чтобы ваши дела, привычки и дневник сохранялись.' :
            'Войдите, чтобы продолжить планировать день вокруг намаза.'}
          </p>
        </header>

        <SegmentedControl
          label="Вход или регистрация"
          options={[
          { id: 'signIn', label: 'Войти' },
          { id: 'signUp', label: 'Регистрация' }]
          }
          value={mode}
          onChange={switchMode} />
        

        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          {isSignUp ?
          <label className="block">
              <span className="mb-1.5 block px-1 text-[13px] text-muted">Имя</span>
              <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="given-name"
              placeholder="Как к вам обращаться"
              className={inputClass} />
            
            </label> :
          null}

          <label className="block">
            <span className="mb-1.5 block px-1 text-[13px] text-muted">Email</span>
            <input
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              className={inputClass} />
            
          </label>

          <label className="block">
            <span className="mb-1.5 block px-1 text-[13px] text-muted">Пароль</span>
            <span className="relative block">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                placeholder={`Не меньше ${MIN_PASSWORD} символов`}
                className={`${inputClass} pr-12`} />
              
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                className="absolute inset-y-0 right-1 flex w-10 items-center justify-center text-muted transition-colors duration-150 ease-out hover:text-ink-soft">
                
                {showPassword ?
                <EyeOffIcon className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" /> :

                <EyeIcon className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
                }
              </button>
            </span>
          </label>

          {error ?
          <p role="alert" className="px-1 text-[13.5px] leading-relaxed text-[#A44A3F]">
              {error}
            </p> :
          null}
          {notice ?
          <p
            role="status"
            className="rounded-xl bg-primary-tint px-3.5 py-3 text-[13.5px] leading-relaxed text-primary">
            
              {notice}
            </p> :
          null}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-[15px] font-medium text-white transition-[transform,opacity] duration-150 ease-out active:scale-[0.99] disabled:opacity-70">
            
            {busy ?
            <LoaderIcon className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden="true" /> :
            null}
            {busy ? isSignUp ? 'Создаём аккаунт…' : 'Входим…' : isSignUp ? 'Создать аккаунт' : 'Войти'}
          </button>
        </form>

        <p className="mt-auto px-1 pt-10 text-center text-[12.5px] leading-relaxed text-muted">
          Ваши данные видны только вам.
        </p>
      </main>
    </div>);

}