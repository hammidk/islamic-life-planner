import { LayersIcon } from 'lucide-react';
import { SPHERE_ICONS } from '../data/spheres';
import type { IconKey } from '../data/spheres';
import { useSpheres } from '../hooks/useSpheres';

interface SphereIconProps {
  id: string;
  color?: string;
  className?: string;
  /** иконка напрямую (предпросмотр новой сферы) */
  icon?: IconKey;
}

export function SphereIcon({ id, color, className = 'h-4 w-4', icon }: SphereIconProps) {
  const { getSphere } = useSpheres();
  const Icon = SPHERE_ICONS[icon ?? getSphere(id).icon] ?? LayersIcon;
  return <Icon className={className} style={{ color }} strokeWidth={1.9} aria-hidden="true" />;
}
