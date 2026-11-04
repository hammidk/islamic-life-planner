import {
  ActivityIcon,
  BabyIcon,
  BookOpenIcon,
  BriefcaseIcon,
  CameraIcon,
  CarIcon,
  CodeIcon,
  CoinsIcon,
  CompassIcon,
  DumbbellIcon,
  GraduationCapIcon,
  HandHeartIcon,
  HeartIcon,
  HomeIcon,
  LayersIcon,
  LeafIcon,
  LightbulbIcon,
  MoonIcon,
  MusicIcon,
  PaletteIcon,
  PlaneIcon,
  SproutIcon,
  SunIcon,
  UsersIcon } from
'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Sphere } from '../types';

/** 24 иконки сфер: первые шесть — у встроенных */
export const SPHERE_ICONS = {
  compass: CompassIcon,
  briefcase: BriefcaseIcon,
  activity: ActivityIcon,
  users: UsersIcon,
  lightbulb: LightbulbIcon,
  layers: LayersIcon,
  book: BookOpenIcon,
  heart: HeartIcon,
  home: HomeIcon,
  dumbbell: DumbbellIcon,
  graduation: GraduationCapIcon,
  palette: PaletteIcon,
  music: MusicIcon,
  plane: PlaneIcon,
  leaf: LeafIcon,
  coins: CoinsIcon,
  baby: BabyIcon,
  handHeart: HandHeartIcon,
  sprout: SproutIcon,
  sun: SunIcon,
  moon: MoonIcon,
  car: CarIcon,
  code: CodeIcon,
  camera: CameraIcon
} satisfies Record<string, LucideIcon>;

export type IconKey = keyof typeof SPHERE_ICONS;
export const ICON_KEYS = Object.keys(SPHERE_ICONS) as IconKey[];

/**
 * 8 цветов пользовательских сфер в палитре приложения (primary, «Удел» и соседние тона).
 * У каждого контраст с белым и со светлой подложкой canvas не ниже 4.5:1.
 */
export const SPHERE_COLORS = {
  green: '#1F5A44',
  violet: '#6E6AA6',
  teal: '#2F6E7D',
  terracotta: '#A4523F',
  ochre: '#82621F',
  plum: '#87507A',
  slate: '#4F5D6B',
  rose: '#A6475A'
} as const;

export type ColorKey = keyof typeof SPHERE_COLORS;
export const COLOR_KEYS = Object.keys(SPHERE_COLORS) as ColorKey[];

export const DEFAULT_ICON: IconKey = 'layers';
export const DEFAULT_COLOR: ColorKey = 'green';

/** Встроенные сферы: id, названия и цвета прежние; удалить и переименовать нельзя */
export const BUILTIN_SPHERES: Sphere[] = [
{ id: 'faith', name: 'Вера', color: '#2F6B52', icon: 'compass', builtin: true },
{ id: 'rizq', name: 'Удел', color: '#6E6AA6', icon: 'briefcase', builtin: true },
{ id: 'health', name: 'Здоровье', color: '#3F7C8C', icon: 'activity', builtin: true },
{ id: 'family', name: 'Семья', color: '#B05F4E', icon: 'users', builtin: true },
{ id: 'ideas', name: 'Идеи и Цели', color: '#A07A2E', icon: 'lightbulb', builtin: true },
{ id: 'other', name: 'Прочее', color: '#8A8F8B', icon: 'layers', builtin: true }];


export const OTHER_SPHERE_ID = 'other';
export const MAX_CUSTOM_SPHERES = 12;
export const SPHERE_NAME_MAX = 24;
