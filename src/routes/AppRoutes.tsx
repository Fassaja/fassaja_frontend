import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
import AuthPage from '@/pages/AuthPage';
import { useAuth } from '@/contexts/AuthContext';

const RequireAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { status } = useAuth();
  return status === 'authed' ? children : <Navigate to="/login" replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Públicas (visitante) */}
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/" element={<DashboardPage />} />
      <Route path="/tasks" element={<TasksPage />} />

      {/* Exigem conta */}
      <Route path="/projects" element={<RequireAuth><ProjectsPage /></RequireAuth>} />
      <Route path="/calendar" element={<RequireAuth><CalendarPage /></RequireAuth>} />
      <Route path="/priorities" element={<RequireAuth><PrioritiesPage /></RequireAuth>} />
      <Route path="/reports" element={<RequireAuth><ReportsPage /></RequireAuth>} />
      <Route path="/team" element={<RequireAuth><TeamPage /></RequireAuth>} />
      <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
      <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
