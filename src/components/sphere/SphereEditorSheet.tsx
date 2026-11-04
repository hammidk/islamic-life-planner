import { useEffect, useState } from 'react';
import { CheckIcon } from 'lucide-react';
import { BottomSheet } from '../BottomSheet';
import { SphereCardBody, SPHERE_CARD_CLASS } from './SphereCard';
import { useApp } from '../../contexts/AppContext';
import { COLOR_KEYS, DEFAULT_COLOR, DEFAULT_ICON, ICON_KEYS, SPHERE_COLORS, SPHERE_ICONS, SPHERE_NAME_MAX } from '../../data/spheres';
import type { ColorKey, IconKey } from '../../data/spheres';
import { checkSphereName, cleanSphereName, sphereRefusalText } from '../../utils/spheres';
import { isSubmitEnter } from '../../utils/keyboard';
import type { CustomSphere } from '../../types';

interface SphereEditorSheetProps {
  open: boolean;
  /** изменить эту сферу; без неё — создать новую */
  sphere?: CustomSphere | null;
  onClose: () => void;
  /** сфера создана или сохранена */
  onDone?: (id: string) => void;
}

/** Окно «Новая сфера» / «Изменить сферу»: название, иконка, цвет, предпросмотр */
export function SphereEditorSheet({ open, sphere, onClose, onDone }: SphereEditorSheetProps) {
  const { customSpheres, addSphere, editSphere } = useApp();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<IconKey>(DEFAULT_ICON);
  const [color, setColor] = useState<ColorKey>(DEFAULT_COLOR);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(sphere?.name ?? '');
    setIcon(sphere?.icon ?? 'book');
    setColor(sphere?.color ?? DEFAULT_COLOR);
    setTouched(false);
  }, [open, sphere]);

  const refusal = checkSphereName(name, customSpheres, sphere?.id);
  // «пусто» не показываем, пока человек ничего не ввёл
  const error = refusal && (refusal !== 'empty' || touched) ? sphereRefusalText[refusal] : null;

  const submit = () => {
    setTouched(true);
    if (refusal) return;
    const input = { name, icon, color };
    const result = sphere ? editSphere(sphere.id, input) : addSphere(input);
    if (result.ok) {
      onDone?.(result.id);
      onClose();
    }
  };

  return (
    <BottomSheet open={open} title={sphere ? 'Изменить сферу' : 'Новая сфера'} onClose={onClose}>
      <div className="flex flex-col gap-4 pb-1">
        <div>
          <input
            autoFocus={!sphere}
            value={name}
            maxLength={SPHERE_NAME_MAX + 8}
            onChange={(e) => setName(e.target.value.slice(0, SPHERE_NAME_MAX + 8))}
            onBlur={() => setName((v) => cleanSphereName(v))}
            onKeyDown={(e) => {
              if (isSubmitEnter(e)) {
                e.preventDefault();
                submit();
              }
            }}
            enterKeyHint="done"
            placeholder="Название, например «Учёба»"
            aria-label="Название сферы"
            aria-invalid={Boolean(error)}
            className="w-full rounded-xl border border-line bg-canvas px-3 py-3 text-[16px] text-ink placeholder:text-muted/80 focus:border-primary/50 focus:outline-none" />
          
          <p className={`mt-1 min-h-[18px] px-1 text-[12.5px] ${error ? 'text-[#A44A3F]' : 'text-muted'}`} role={error ? 'alert' : undefined}>
            {error ?? `До ${SPHERE_NAME_MAX} символов`}
          </p>
        </div>

        <fieldset>
          <legend className="mb-2 px-1 text-[12px] font-medium uppercase tracking-[0.06em] text-muted">Иконка</legend>
          <div className="grid grid-cols-6 gap-1.5">
            {ICON_KEYS.map((key) => {
              const Icon = SPHERE_ICONS[key];
              const on = key === icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIcon(key)}
                  aria-pressed={on}
                  aria-label={`Иконка ${key}`}
                  className={`flex h-11 items-center justify-center rounded-xl border transition-colors duration-150 ease-out ${
                  on ? 'border-transparent text-white' : 'border-line bg-surface text-ink-soft hover:border-primary/40'}`
                  }
                  style={on ? { backgroundColor: SPHERE_COLORS[color] } : undefined}>
                  
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden="true" />
                </button>);

            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 px-1 text-[12px] font-medium uppercase tracking-[0.06em] text-muted">Цвет</legend>
          <div className="flex flex-wrap gap-2.5">
            {COLOR_KEYS.map((key) =>
            <button
              key={key}
              type="button"
              onClick={() => setColor(key)}
              aria-pressed={key === color}
              aria-label={`Цвет ${key}`}
              className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: SPHERE_COLORS[key] }}>
              
                {key === color ? <CheckIcon className="h-5 w-5 text-white" strokeWidth={2.6} aria-hidden="true" /> : null}
              </button>
            )}
          </div>
        </fieldset>

        <div className="flex items-center gap-3">
          <div className={SPHERE_CARD_CLASS} aria-hidden="true">
            <SphereCardBody id={sphere?.id ?? 'preview'} icon={icon} name={cleanSphereName(name) || 'Название'} color={SPHERE_COLORS[color]} count={0} />
          </div>
          <span className="text-[12.5px] text-muted">Так сфера будет выглядеть на Главной</span>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={Boolean(refusal)}
          className="min-h-[48px] rounded-xl bg-primary text-[15px] font-medium text-white disabled:opacity-40">
          
          {sphere ? 'Сохранить' : 'Создать'}
        </button>
      </div>
    </BottomSheet>);

}
