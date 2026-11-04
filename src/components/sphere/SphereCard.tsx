import { SphereIcon } from '../SphereIcon';
import type { IconKey } from '../../data/spheres';

interface SphereCardProps {
  id: string;
  name: string;
  color: string;
  count: number;
  /** иконка напрямую — для предпросмотра ещё не созданной сферы */
  icon?: IconKey;
}

/** Содержимое карточки сферы на Главной: иконка, счётчик, название */
export function SphereCardBody({ id, name, color, count, icon }: SphereCardProps) {
  return (
    <>
      <span className="flex w-full items-center justify-between">
        <SphereIcon id={id} icon={icon} color={color} className="h-[16px] w-[16px]" />
        <span className="text-[14px] font-medium tabular-nums text-ink-soft">{count}</span>
      </span>
      <span className="line-clamp-2 text-[12.5px] font-semibold leading-tight text-ink">{name}</span>
    </>);

}

export const SPHERE_CARD_CLASS =
'flex h-[68px] w-[92px] flex-col justify-between rounded-xl border border-line bg-surface px-2.5 py-2 text-left shadow-card transition-colors duration-150 ease-out hover:border-primary/40';
