import { TaskList } from './task/TaskList';
import type { Task } from '../types';

interface DayTaskListProps {
  tasks: Task[];
  divider: string;
  /** непрозрачный фон строки (под ним — слой действий) */
  surface?: string;
  /** выполненные дела исчезают из списка после короткой паузы */
  hideDone?: boolean;
  /** показывать дату в мета-строке */
  showDate?: boolean;
  /** название сферы цветом сферы */
  sphereColor?: boolean;
  /** день списка — для отметки вхождений повторяющихся дел */
  day?: string;
}

/** Список дел дня (Сегодня, день, история): строки с раскрываемыми пунктами */
export function DayTaskList({
  tasks,
  divider,
  surface = 'bg-surface',
  hideDone = false,
  showDate = true,
  sphereColor = false,
  day
}: DayTaskListProps) {
  return (
    <TaskList
      tasks={tasks}
      divider={divider}
      hideDone={hideDone}
      day={day}
      look={{ surface, showDate, sphereColor, checklist: true }} />);


}
