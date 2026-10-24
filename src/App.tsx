import React from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AuthGate } from './components/AuthGate';
import { TaskDraftProvider } from './contexts/TaskDraftContext';
import { QuickAddProvider } from './contexts/QuickAddContext';
import { Home } from './pages/Home';
import { WeekTasks } from './pages/WeekTasks';
import { History } from './pages/History';
import { SphereDetail } from './pages/SphereDetail';
import { SectionDetail } from './pages/SectionDetail';
import { DayTasks } from './pages/DayTasks';
import { TaskStats } from './pages/TaskStats';
import { TaskDetail } from './pages/TaskDetail';
import { Journal } from './pages/Journal';
import { JournalHistory } from './pages/JournalHistory';
import { JournalEntryPage } from './pages/JournalEntryPage';
import { Achievements } from './pages/Achievements';
import { LifeBalance } from './pages/LifeBalance';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { PrayerSettings } from './pages/PrayerSettings';

export function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <TaskDraftProvider>
          <HashRouter>
            <QuickAddProvider>
              <div className="min-h-full w-full bg-[#ECEEEA] font-sans text-ink antialiased">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/today" element={<DayTasks />} />
                  <Route path="/today/other" element={<Navigate to="/sphere/other" replace />} />
                  <Route path="/day/:date" element={<DayTasks />} />
                  <Route path="/week" element={<WeekTasks />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/sphere/:id" element={<SphereDetail />} />
                  <Route path="/sphere/:id/section/:sectionId" element={<SectionDetail />} />
                  <Route path="/tasks/stats" element={<TaskStats />} />
                  <Route path="/task/:id" element={<TaskDetail />} />
                  <Route path="/journal" element={<Journal />} />
                  <Route path="/journal/history" element={<JournalHistory />} />
                  <Route path="/journal/entry/:id" element={<JournalEntryPage />} />
                  <Route path="/journal/achievements" element={<Achievements />} />
                  <Route path="/journal/balance" element={<LifeBalance />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/settings/prayers" element={<PrayerSettings />} />
                  <Route path="*" element={<Home />} />
                </Routes>
              </div>
            </QuickAddProvider>
          </HashRouter>
        </TaskDraftProvider>
      </AuthGate>
    </AuthProvider>);

}