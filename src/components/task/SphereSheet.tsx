import React from 'react';
import { BottomSheet } from '../BottomSheet';
import { SheetOption } from './SheetOption';
import { SphereIcon } from '../SphereIcon';
import { spheres } from '../../data/appData';
import type { SphereId } from '../../types';

interface SphereSheetProps {
  open: boolean;
  value: SphereId | null;
  onSelect: (id: SphereId) => void;
  onClose: () => void;
}

export function SphereSheet({ open, value, onSelect, onClose }: SphereSheetProps) {
  return (
    <BottomSheet open={open} title="Сфера жизни" onClose={onClose}>
      <div className="-mx-3">
        {spheres.map((s) =>
        <SheetOption
          key={s.id}
          label={s.name}
          selected={value === s.id}
          icon={<SphereIcon id={s.id} color={s.color} />}
          onClick={() => {
            onSelect(s.id);
            onClose();
          }} />

        )}
      </div>
    </BottomSheet>);

}