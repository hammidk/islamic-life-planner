import { useState } from 'react';
import { PopoverMenu } from '../ui/PopoverMenu';
import { SphereEditorSheet } from './SphereEditorSheet';
import { useApp } from '../../contexts/AppContext';
import { askConfirm } from '../../utils/confirm';
import { sphereContents } from '../../utils/spheres';
import type { CustomSphere } from '../../types';

/** «5 дел», «1 раздел» */
export function countWord(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ${forms[0]}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} ${forms[1]}`;
  return `${n} ${forms[2]}`;
}

interface SphereMenuProps {
  /** пользовательская сфера; у встроенных меню нет */
  sphere: CustomSphere | null;
  open: boolean;
  anchor: HTMLElement | null;
  onClose: () => void;
  /** сфера удалена — например, уйти с её страницы */
  onDeleted?: () => void;
}

/** Меню пользовательской сферы: «Изменить» (то же окно, что при создании) и «Удалить» */
export function SphereMenu({ sphere, open, anchor, onClose, onDeleted }: SphereMenuProps) {
  const { tasks, sections, removeSphere } = useApp();
  const [editing, setEditing] = useState<CustomSphere | null>(null);

  const remove = async (s: CustomSphere) => {
    const { tasks: n, sections: m } = sphereContents({ tasks, sections }, s.id);
    const ok = await askConfirm(
      `Удалить сферу «${s.name}»? ${countWord(n, ['дело', 'дела', 'дел'])} и ${countWord(m, ['раздел', 'раздела', 'разделов'])} перейдут в «Прочее»`
    );
    if (ok && removeSphere(s.id)) onDeleted?.();
  };

  return (
    <>
      <PopoverMenu
        open={open && Boolean(sphere)}
        anchor={anchor}
        label={sphere ? `Сфера «${sphere.name}»` : 'Сфера'}
        items={[
        { key: 'edit', label: 'Изменить' },
        { key: 'delete', label: 'Удалить' }]
        }
        onClose={onClose}
        onSelect={(key) => {
          onClose();
          if (!sphere) return;
          if (key === 'edit') setEditing(sphere);else
          void remove(sphere);
        }} />
      
      <SphereEditorSheet open={Boolean(editing)} sphere={editing} onClose={() => setEditing(null)} />
    </>);

}
