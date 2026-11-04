import { useMemo } from 'react';
import { useOptionalApp } from '../contexts/AppContext';
import { mergeSpheres, resolveSphere } from '../utils/spheres';
import type { Sphere } from '../types';

/**
 * Все сферы: встроенные, затем пользовательские по order. getSphere для неизвестного id
 * (например, удалённой сферы) возвращает «Прочее» — данные дела при этом не меняются.
 */
export function useSpheres(): {spheres: Sphere[];getSphere: (id: string | undefined) => Sphere;} {
  const app = useOptionalApp();
  const custom = app?.customSpheres;
  return useMemo(() => {
    const spheres = mergeSpheres(custom ?? []);
    return { spheres, getSphere: (id: string | undefined) => resolveSphere(spheres, id) };
  }, [custom]);
}
