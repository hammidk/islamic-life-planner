import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '../contexts/AuthContext';

/** Круглая кнопка с инициалом — вход в профиль из шапок основных экранов */
export function ProfileButton() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  return (
    <button
      type="button"
      onClick={() => navigate('/profile')}
      aria-label="Открыть профиль"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-tint text-[14px] font-medium text-primary transition-transform duration-150 ease-out active:scale-95">
      
      {user.initial}
    </button>);

}