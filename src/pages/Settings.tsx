import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shell, SubHeader } from '../components/Shell';
import { MenuGroup, MenuRow } from '../components/MenuRow';
import { Toggle } from '../components/Toggle';
import { useApp } from '../contexts/AppContext';
import type { SyncStatus } from '../contexts/AppContext';

const syncLabels: Record<SyncStatus, string> = {
  saved: 'Сохранено',
  saving: 'Сохранение…',
  offline: 'Нет сети — сохранено на устройстве'
};

export function Settings() {
  const navigate = useNavigate();
  const { syncStatus } = useApp();
  const [notify, setNotify] = useState({
    tasks: true,
    habits: true,
    journal: true
  });

  return (
    <Shell>
      <SubHeader title="Настройки" />

      <MenuGroup title="Основное">
        <MenuRow label="Язык" value="Русский" onClick={() => undefined} />
        <MenuRow label="Тема" value="Системная" onClick={() => undefined} />
        <MenuRow label="Формат времени" value="24 часа" onClick={() => undefined} />
      </MenuGroup>

      <MenuGroup title="Уведомления">
        <MenuRow
          label="Напоминания о намазах"
          value="Настроить"
          onClick={() => navigate('/settings/prayers')} />
        
        <MenuRow
          label="Напоминания о делах"
          right={
          <Toggle
            checked={notify.tasks}
            onChange={(v) => setNotify((n) => ({ ...n, tasks: v }))}
            label="Напоминания о делах" />

          } />
        
        <MenuRow
          label="Вечерний дневник"
          right={
          <Toggle
            checked={notify.journal}
            onChange={(v) => setNotify((n) => ({ ...n, journal: v }))}
            label="Напоминание о дневнике" />

          } />
        
      </MenuGroup>

      <MenuGroup title="Данные">
        <MenuRow
          label="Синхронизация"
          right={
          <span
            role="status"
            aria-live="polite"
            className="flex min-w-0 items-center gap-1.5 text-right text-[12.5px] text-muted">
            
              <span
              className={`h-[6px] w-[6px] shrink-0 rounded-full ${
              syncStatus === 'saved' ?
              'bg-primary' :
              syncStatus === 'saving' ?
              'bg-primary/40' :
              'bg-[#C9A24A]'}`
              }
              aria-hidden="true" />
            
              {syncLabels[syncStatus]}
            </span>
          } />
        
      </MenuGroup>
    </Shell>);

}