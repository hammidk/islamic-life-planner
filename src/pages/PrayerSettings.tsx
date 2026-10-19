import React, { useState } from 'react';
import { ChevronRightIcon } from 'lucide-react';
import { Shell, SubHeader } from '../components/Shell';
import { MenuGroup, MenuRow } from '../components/MenuRow';
import { Toggle } from '../components/Toggle';
import { BottomSheet } from '../components/BottomSheet';
import { SheetOption } from '../components/task/SheetOption';
import { useLive } from '../contexts/LiveDataContext';
import { PRAYER_METHODS, PRAYER_SCHOOLS } from '../utils/live';

export function PrayerSettings() {
  const { prayers, location, locating, openLocationPicker, prayerConfig, setPrayerConfig } =
  useLive();
  const [sheet, setSheet] = useState<'method' | 'school' | null>(null);
  const method = PRAYER_METHODS.find((m) => m.id === prayerConfig.method);
  const school = PRAYER_SCHOOLS.find((s) => s.id === prayerConfig.school);
  const [state, setState] = useState<Record<string, boolean>>(() =>
  Object.fromEntries(prayers.map((p) => [p.id, p.notify]))
  );
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <Shell>
      <SubHeader title="Намазы" subtitle="Основа структуры дня" />

      <MenuGroup title="Расчёт">
        <MenuRow
          label="Местоположение"
          value={location?.city ?? (locating ? 'Определяем…' : 'Не выбрано')}
          onClick={openLocationPicker} />
        
        <MenuRow
          label="Метод расчёта"
          value={method?.short ?? ''}
          onClick={() => setSheet('method')} />
        
        <MenuRow
          label="Правовая школа"
          value={school?.short ?? ''}
          onClick={() => setSheet('school')} />
        
      </MenuGroup>

      <MenuGroup title="Напоминания о намазах">
        {prayers.map((p) => {
          const open = expanded === p.id;
          return (
            <div key={p.id}>
              <div className="flex items-center justify-between px-4 py-[15px]">
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : p.id)}
                  aria-expanded={open}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  
                  <span className="text-[15px] text-ink">{p.name}</span>
                  <span className="text-[13.5px] tabular-nums text-muted">{p.time}</span>
                  <ChevronRightIcon
                    className={`h-4 w-4 text-muted transition-transform duration-200 ease-out ${
                    open ? 'rotate-90' : ''}`
                    }
                    strokeWidth={1.8}
                    aria-hidden="true" />
                  
                </button>
                <Toggle
                  checked={state[p.id]}
                  onChange={(v) => setState((s) => ({ ...s, [p.id]: v }))}
                  label={`Напоминание: ${p.name}`} />
                
              </div>

              {open ?
              <div className="border-t border-line/70 bg-canvas/40 px-4 py-3">
                  {[
                { label: 'Заранее', value: '10 минут' },
                { label: 'Звук', value: 'Азан (тихо)' },
                { label: 'Повтор', value: 'Один раз' }].
                map((row) =>
                <div key={row.label} className="flex justify-between py-1.5">
                      <span className="text-[13.5px] text-muted">{row.label}</span>
                      <span className="text-[13.5px] text-ink-soft">{row.value}</span>
                    </div>
                )}
                </div> :
              null}
            </div>);

        })}
      </MenuGroup>

      {method && location ?
      <p className="-mt-3 mb-4 truncate px-1 text-[12px] text-muted">
          Расчёт: {method.label}, {location.city}
        </p> :
      null}

      <BottomSheet
        open={sheet === 'method'}
        title="Метод расчёта"
        onClose={() => setSheet(null)}>
        
        <div className="-mx-3">
          {PRAYER_METHODS.map((m) =>
          <SheetOption
            key={m.id}
            label={m.label}
            selected={prayerConfig.method === m.id}
            onClick={() => {
              setPrayerConfig({ method: m.id });
              setSheet(null);
            }} />

          )}
        </div>
      </BottomSheet>

      <BottomSheet
        open={sheet === 'school'}
        title="Правовая школа"
        onClose={() => setSheet(null)}>
        
        <div className="-mx-3">
          {PRAYER_SCHOOLS.map((s) =>
          <SheetOption
            key={s.id}
            label={s.label}
            hint={s.hint}
            selected={prayerConfig.school === s.id}
            onClick={() => {
              setPrayerConfig({ school: s.id });
              setSheet(null);
            }} />

          )}
        </div>
      </BottomSheet>

      <p className="px-1 text-[12.5px] leading-relaxed text-muted">
        Времена намазов определяют периоды дня в разделах «Сегодня» и «План».
      </p>
    </Shell>);

}