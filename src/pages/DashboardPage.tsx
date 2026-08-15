import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageTour } from '@/components/onboarding/PageTour';
import { TodayFocus } from '@/components/dashboard/TodayFocus';
import { StatStrip } from '@/components/common/StatStrip';
import { WeeklyOverviewChart } from '@/components/dashboard/WeeklyOverviewChart';
import { ProgressCard } from '@/components/dashboard/ProgressCard';
import { UpcomingTasks } from '@/components/dashboard/UpcomingTasks';
import { XpCard } from '@/components/dashboard/XpCard';
import { StreakContent } from '@/components/dashboard/StreakCard';
import { EmptyState } from '@/components/common/EmptyState';
import { DashboardSkeleton } from '@/components/common/Skeletons';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useDeferredLoading } from '@/hooks/useDeferredLoading';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { isToday } from '@/utils/date';

const DashboardPage: React.FC = () => {
  const { tasks, completeTask, createTask, loading } = useTasks();
  const showSkeleton = useDeferredLoading(loading);
  const { projects } = useProjects();
  const { user } = useUser();
  const { isGuest, guestTaskCount, guestTaskLimit, requireAuth } = useAuth();
  const stats = useDashboardStats(tasks);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);

  const openNewTask = () => {
    if (isGuest && guestTaskCount >= guestTaskLimit) {
      requireAuth(`Visitantes podem criar até ${guestTaskLimit} tarefas por dia. Entre para criar mais.`);
      return;
    }
    setShowNewTaskModal(true);
  };

  const upcomingTasks = tasks
    .filter(t => t.status !== 'completed')
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, 8);

  // Números do dia: é o que o bloco de abertura mostra, no lugar da saudação.
  const completedToday = tasks.filter(
    t => t.status === 'completed' && t.completedAt && isToday(t.completedAt),
  ).length;
  const dueToday = tasks.filter(
    t => t.status !== 'completed' && t.dueDate && isToday(t.dueDate),
  ).length;

  // Data por extenso na barra superior — informação, no lugar da segunda saudação.
  const todayLabel = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <>
      <CreateTaskModal
        isOpen={showNewTaskModal}
        onClose={() => setShowNewTaskModal(false)}
        onCreateTask={createTask}
      />

      <AppLayout
        onNewTask={openNewTask}
        title={`Olá, ${user.name}`}
        subtitle={todayLabel}
      >
        <PageTour id="dashboard" />
        {loading ? (showSkeleton ? <DashboardSkeleton /> : null) : <>
        <TodayFocus
          overdue={stats.overdue}
          dueToday={dueToday}
          completedToday={completedToday}
          totalTasks={stats.total}
          onNewTask={openNewTask}
        />

        <StatStrip
          className="mb-6"
          stats={[
            { label: 'Total', value: stats.total, comparison: stats.comparisons.total },
            { label: 'Concluídas', value: stats.completed, comparison: stats.comparisons.completed },
            { label: 'Em andamento', value: stats.inProgress, comparison: stats.comparisons.inProgress },
            { label: 'Atrasadas', value: stats.overdue, comparison: stats.comparisons.overdue, alert: true },
          ]}
        />

        {/* Overview + Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <WeeklyOverviewChart tasks={tasks} />
          </div>
          <div className="lg:col-span-1">
            <ProgressCard
              percentage={stats.completionRate}
              goals={{
                daily: { done: completedToday, goal: user.dailyGoal },
                weekly: { done: stats.thisWeekCompleted, goal: user.weeklyGoal },
              }}
            />
          </div>
        </div>

        {/* Próximas tarefas (foco) + Prioridade */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {upcomingTasks.length > 0 ? (
              <UpcomingTasks tasks={upcomingTasks} projects={projects} onComplete={completeTask} />
            ) : (
              <EmptyState
                mascotState="happy"
                title="Tudo em dia!"
                description="Você não tem tarefas pendentes. Que tal criar uma nova?"
                action={{ label: 'Nova tarefa', onClick: openNewTask }}
              />
            )}
          </div>
          <div className="lg:col-span-1">
            <XpCard>
              <StreakContent />
            </XpCard>
          </div>
        </div>
        </>}
      </AppLayout>
    </>
  );
};

export default DashboardPage;
