import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardPage from '@/pages/DashboardPage';
import TasksPage from '@/pages/TasksPage';
import ProjectsPage from '@/pages/ProjectsPage';
import CalendarPage from '@/pages/CalendarPage';
import PrioritiesPage from '@/pages/PrioritiesPage';
import ReportsPage from '@/pages/ReportsPage';
import TeamPage from '@/pages/TeamPage';
import ProfilePage from '@/pages/ProfilePage';
import SettingsPage from '@/pages/SettingsPage';
import NotFoundPage from '@/pages/NotFoundPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/tasks" element={<TasksPage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/calendar" element={<CalendarPage />} />
      <Route path="/priorities" element={<PrioritiesPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/team" element={<TeamPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
