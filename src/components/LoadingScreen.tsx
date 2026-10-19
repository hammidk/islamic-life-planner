import React from 'react';

interface LoadingScreenProps {
  label?: string;
}

/** Спокойный экран ожидания в стиле приложения */
export function LoadingScreen({ label = 'Загрузка…' }: LoadingScreenProps) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#ECEEEA] font-sans antialiased">
      <div
        className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col items-center justify-center gap-4 bg-canvas px-8"
        role="status"
        aria-live="polite">
        
        <span
          className="h-7 w-7 animate-spin rounded-full border-2 border-primary/20 border-t-primary motion-reduce:animate-none"
          aria-hidden="true" />
        
        <p className="text-[14px] text-muted">{label}</p>
      </div>
    </div>);

}