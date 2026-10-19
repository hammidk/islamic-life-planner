import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { MenuGroup, MenuRow } from '../components/MenuRow';
import { useApp } from '../contexts/AppContext';
import { useCurrentUser } from '../contexts/AuthContext';

export function Profile() {
  const navigate = useNavigate();
  const { logout } = useApp();
  const user = useCurrentUser();
  const [leaving, setLeaving] = useState(false);

  const leave = async () => {
    if (leaving) return;
    setLeaving(true);
    await logout();
  };

  return (
    <Shell nav>
      <header className="pb-5 pt-3">
        <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.015em] text-ink">
          Профиль
        </h1>
      </header>

      <div className="mb-6 flex items-center gap-4 rounded-card border border-line bg-surface px-4 py-4 shadow-card">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-tint text-[20px] font-medium text-primary">
          {user.initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-medium text-ink">{user.name}</p>
          <p className="mt-0.5 truncate text-[13px] text-muted">{user.email}</p>
        </div>
      </div>

      <MenuGroup>
        <MenuRow label="Настройки" onClick={() => navigate('/settings')} />
        <MenuRow label="Намазы" onClick={() => navigate('/settings/prayers')} />
        <MenuRow label="История" onClick={() => navigate('/history')} />
      </MenuGroup>

      <MenuGroup>
        <MenuRow
          label={leaving ? 'Выходим…' : 'Выйти из аккаунта'}
          danger
          onClick={() => void leave()} />
        
      </MenuGroup>
    </Shell>);

}