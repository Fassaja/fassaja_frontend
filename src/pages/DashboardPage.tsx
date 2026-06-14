import React, { useState } from 'react';
import { CheckCircle, Clock, AlertCircle, ListTodo } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { WeeklyOverviewChart } from '@/components/dashboard/WeeklyOverviewChart';
import { ProgressCard } from '@/components/dashboard/ProgressCard';
import { UpcomingTasks } from '@/components/dashboard/UpcomingTasks';
import { PriorityChart } from '@/components/dashboard/PriorityChart';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { EmptyState } from '@/components/common/EmptyState';
import { Card } from '@/components/common/Card';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { MascotState } from '@/components/mascot/Mascot';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { mockUser } from '@/data/mockUser';

const DashboardPage: React.FC = () => {
  const { tasks, completeTask, createTask } = useTasks();
  const { projects } = useProjects();
  const stats = useDashboardStats(tasks);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);

  const upcomingTasks = tasks
    .filter(t => t.status !== 'completed')
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, 5);

  const progressMascot = ((): MascotState => {
    if (stats.total === 0) return 'confused';
    if (stats.overdue >= 3 || stats.overdue > stats.completed) return 'sad';
    if (stats.completionRate >= 75) return 'strong';
    if (stats.completionRate > 0) return 'happy';
    return 'confused';
  })();

  const progressCopy = (() => {
    if (progressMascot === 'sad')
      return { headline: 'Atenção!', message: 'Você tem tarefas atrasadas. Bora colocar em dia?' };
    if (stats.completionRate >= 75)
      return { headline: 'Mandou bem!', message: 'Você está arrasando nas suas tarefas! 💪' };
    if (stats.completionRate >= 40)
      return { headline: 'Bom progresso!', message: 'Continue assim, falta pouco.' };
    if (stats.completionRate > 0)
      return { headline: 'Vamos lá!', message: 'Cada tarefa concluída conta.' };
    return { headline: 'Comece agora', message: 'Crie e conclua sua primeira tarefa.' };
  })();

  return (
    <>
      <CreateTaskModal
        isOpen={showNewTaskModal}
        onClose={() => setShowNewTaskModal(false)}
        onCreateTask={createTask}
      />

      <AppLayout
        onNewTask={() => setShowNewTaskModal(true)}
        title={`Olá, ${mockUser.name}! 👋`}
        subtitle="Que bom te ver por aqui. Vamos ser produtivos hoje?"
      >
        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
          <MetricCard
            title="Total de Tarefas"
            value={stats.total}
            icon={<ListTodo size={22} />}
            color="#2477FF"
            comparison={{ value: 12, isPositive: true, period: 'semana passada' }}
          />
          <MetricCard
            title="Concluídas"
            value={stats.completed}
            icon={<CheckCircle size={22} />}
            color="#22C55E"
            comparison={{ value: 18, isPositive: true, period: 'semana passada' }}
          />
          <MetricCard
            title="Em Andamento"
            value={stats.inProgress}
            icon={<Clock size={22} />}
            color="#FBBF24"
            comparison={{ value: 5, isPositive: false, period: 'semana passada' }}
          />
          <MetricCard
            title="Atrasadas"
            value={stats.overdue}
            icon={<AlertCircle size={22} />}
            color="#F43F5E"
            comparison={{ value: 2, isPositive: false, period: 'semana passada' }}
          />
        </div>

        {/* Overview + Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <WeeklyOverviewChart tasks={tasks} />
          </div>
          <div className="lg:col-span-1">
            <ProgressCard
              percentage={stats.completionRate}
              headline={progressCopy.headline}
              message={progressCopy.message}
              mascotState={progressMascot}
            />
          </div>
        </div>

        {/* Tasks + Priority + Shortcuts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            {upcomingTasks.length > 0 ? (
              <UpcomingTasks tasks={upcomingTasks} projects={projects} onComplete={completeTask} />
            ) : (
              <Card className="h-full flex items-center">
                <EmptyState
                  mascotState="happy"
                  title="Tudo em dia!"
                  description="Você não tem tarefas pendentes. Que tal criar uma nova?"
                  action={{ label: 'Nova Tarefa', onClick: () => setShowNewTaskModal(true) }}
                />
              </Card>
            )}
          </div>
          <div className="lg:col-span-4">
            <PriorityChart tasks={tasks} />
          </div>
          <div className="lg:col-span-3">
            <QuickActions onNewTask={() => setShowNewTaskModal(true)} />
          </div>
        </div>
      </AppLayout>
    </>
  );
};

export default DashboardPage;
