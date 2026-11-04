import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from '../contexts/AppContext';
import { TaskDraftProvider } from '../contexts/TaskDraftContext';
import { QuickAddProvider } from '../contexts/QuickAddContext';
import { emptySnapshot } from '../utils/userData';
import { Home } from '../pages/Home';
import { DayTasks } from '../pages/DayTasks';
import { SphereDetail } from '../pages/SphereDetail';
import { SectionDetail } from '../pages/SectionDetail';
import { TaskDetail } from '../pages/TaskDetail';
import { Journal } from '../pages/Journal';
import type { ChecklistItem, Section, Task } from '../types';

/** Последнее состояние приложения — чтобы проверять, что дела действительно созданы */
export const appState: {tasks: Task[];checklists: Record<string, ChecklistItem[]>;} = { tasks: [], checklists: {} };

function Probe() {
  const { tasks, checklists } = useApp();
  appState.tasks = tasks;
  appState.checklists = checklists;
  return null;
}

let seq = 0;
export const makeTask = (title: string, patch: Partial<Task> = {}): Task => ({
  id: `t-${++seq}`,
  title,
  sphere: 'other',
  period: 'untilDhuhr',
  status: 'open',
  order: seq,
  ...patch
});

/** Настоящие экраны приложения с данными пользователя в памяти */
export function renderApp(
route: string,
data: {tasks?: Task[];sections?: Section[];checklists?: Record<string, ChecklistItem[]>;} = {})
{
  const initial = {
    ...emptySnapshot(),
    tasks: data.tasks ?? [],
    sections: data.sections ?? [],
    checklists: data.checklists ?? {}
  };
  return render(
    <AppProvider userId="test-user" initial={initial} needsUpload={false} offline={false}>
      <TaskDraftProvider>
        <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <QuickAddProvider>
            <Probe />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/today" element={<DayTasks />} />
              <Route path="/day/:date" element={<DayTasks />} />
              <Route path="/sphere/:id" element={<SphereDetail />} />
              <Route path="/sphere/:id/section/:sectionId" element={<SectionDetail />} />
              <Route path="/task/:id" element={<TaskDetail />} />
              <Route path="/journal" element={<Journal />} />
            </Routes>
          </QuickAddProvider>
        </MemoryRouter>
      </TaskDraftProvider>
    </AppProvider>
  );
}
