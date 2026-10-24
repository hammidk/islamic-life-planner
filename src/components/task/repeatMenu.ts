import { formatRepeat } from '../../utils/taskOptions';
import type { PopoverItem } from '../ui/PopoverMenu';
import type { RepeatRule } from '../../types';

/** Меню повтора — одно и то же в чипе карточки и на экране «Дата и время» */
export function repeatMenuItems(value?: RepeatRule): PopoverItem[] {
  const rule = value ?? { kind: 'none' as const };
  return [
  { key: 'none', label: 'Никогда', selected: rule.kind === 'none' },
  { key: 'daily', label: 'Каждый день', selected: rule.kind === 'daily' },
  { key: 'weeks1', label: 'Каждую неделю', selected: rule.kind === 'weeks' && rule.every === 1 },
  { key: 'weeks2', label: 'Каждые 2 недели', selected: rule.kind === 'weeks' && rule.every === 2 },
  { key: 'monthly', label: 'Каждый месяц', selected: rule.kind === 'monthly' },
  {
    key: 'custom',
    label: 'Настроить…',
    selected: rule.kind === 'weekdays' || rule.kind === 'weeks' && rule.every > 2
  }];

}

/** Правило по пункту меню; null — «Настроить…» (открыть выбор дней недели) */
export function repeatRuleForKey(key: string): RepeatRule | null {
  if (key === 'custom') return null;
  if (key === 'daily') return { kind: 'daily' };
  if (key === 'weeks1') return { kind: 'weeks', every: 1 };
  if (key === 'weeks2') return { kind: 'weeks', every: 2 };
  if (key === 'monthly') return { kind: 'monthly' };
  return { kind: 'none' };
}

/** «Никогда», «Каждый день»… */
export function repeatLabel(value?: RepeatRule): string {
  return !value || value.kind === 'none' ? 'Никогда' : formatRepeat(value);
}
