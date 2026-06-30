import React, { useState } from 'react';
import { CheckCircle, Clock, AlertCircle, ListTodo, Sparkles, Flame } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { WeeklyOverviewChart } from '@/components/dashboard/WeeklyOverviewChart';
import { ProgressCard } from '@/components/dashboard/ProgressCard';
import { UpcomingTasks } from '@/components/dashboard/UpcomingTasks';
import { XpCard } from '@/components/dashboard/XpCard';
import { StreakContent } from '@/components/dashboard/StreakCard';
import { EmptyState } from '@/components/common/EmptyState';
import { Card } from '@/components/common/Card';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { Mascot, MascotState } from '@/components/mascot/Mascot';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useDeferredLoading } from '@/hooks/useDeferredLoading';
import { useUser, computeStreak } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { isToday } from '@/utils/date';
import { computeXp } from '@/utils/xp';

const DashboardPage: React.FC = () => {
  const { tasks, completeTask, createTask, loading } = useTasks();
  const showSkeleton = useDeferredLoading(loading);
  const { projects } = useProjects();
  const { user } = useUser();
  const { isGuest, guestTaskCount, guestTaskLimit, requireAuth } = useAuth();
  const stats = useDashboardStats(tasks);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);

  // Gamificação para os chips do banner (nível + sequência).
  const xp = computeXp(tasks);
  const streak = (() => {
    const days = new Set<string>(user.productiveDays);
    tasks.forEach(t => {
      if (t.status === 'completed' && t.completedAt) {
        const d = new Date(t.completedAt);
        days.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
      }
    });
    return computeStreak(Array.from(days));
  })();

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

  // Mascote do card de progresso (distinto do banner para não repetir o mesmo Bob).
  const progressMascot = ((): MascotState => {
    if (stats.total === 0) return 'confused';
    if (stats.overdue >= 3 || stats.overdue > stats.completed) return 'sad';
    if (stats.completionRate >= 75) return 'celebrate';
    if (stats.completionRate > 0) return 'strong';
    return 'confused';
  })();

  // Saudação do banner por horário (não duplica o card de progresso).
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia! ☀️';
    if (h < 18) return 'Boa tarde! 🌤️';
    return 'Boa noite! 🌙';
  })();

  // Cena de fundo do banner conforme o horário: dia das 5h às 17h, noite das 17h às 5h.
  const bannerIsDay = (() => {
    const h = new Date().getHours();
    return h >= 5 && h < 17;
  })();
  const bannerSrc = bannerIsDay ? '/dia.png' : '/noite.png';

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
        onNewTask={openNewTask}
        title={`Olá, ${user.name}! 👋`}
        subtitle="Que bom te ver por aqui. Vamos ser produtivos hoje?"
      >
        {loading ? (showSkeleton ? <LoadingScreen /> : null) : <>
        {/* Bob greeting banner — cena de fundo muda com o horário (dia/noite) */}
        <div
          className={`mb-6 flex items-center gap-4 rounded-2xl text-white p-5 sm:p-6 relative overflow-hidden bg-gradient-to-br ${
            bannerIsDay ? 'from-primary-vibrant to-primary-dark' : 'from-[#243089] to-[#0a1640]'
          }`}
        >
          {/* Cena decorativa (dia/noite). Se a imagem faltar, sobra só o gradiente. */}
          <img
            src={bannerSrc}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover object-right scale-105 pointer-events-none select-none"
          />
          <div className="shrink-0 -my-2 relative z-10">
            <Mascot state="happy" size="sm" animate />
          </div>
          <div className="relative z-10">
            <p className="text-lg font-extrabold leading-tight">{greeting}</p>
            <p className="text-white/85 text-sm mt-0.5">
              {stats.total === 0
                ? 'Crie sua primeira tarefa e bora começar.'
                : 'Pronto para mais um dia produtivo?'}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-white text-xs font-bold backdrop-blur-sm">
                <Sparkles size={13} /> Nível {xp.level}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-white text-xs font-bold backdrop-blur-sm">
                <Flame size={13} /> {streak} {streak === 1 ? 'dia' : 'dias'} de sequência
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-white text-xs font-bold backdrop-blur-sm">
                {xp.xp} XP
              </span>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5 mb-6">
          <MetricCard
            title="Total de Tarefas"
            value={stats.total}
            icon={<ListTodo size={22} />}
            color="#2477FF"
            comparison={stats.comparisons.total}
          />
          <MetricCard
            title="Concluídas"
            value={stats.completed}
            icon={<CheckCircle size={22} />}
            color="#22C55E"
            comparison={stats.comparisons.completed}
          />
          <MetricCard
            title="Em Andamento"
            value={stats.inProgress}
            icon={<Clock size={22} />}
            color="#FBBF24"
            comparison={stats.comparisons.inProgress}
          />
          <MetricCard
            title="Atrasadas"
            value={stats.overdue}
            icon={<AlertCircle size={22} />}
            color="#F43F5E"
            comparison={stats.comparisons.overdue}
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
              goals={{
                daily: {
                  done: tasks.filter(
                    t => t.status === 'completed' && t.completedAt && isToday(t.completedAt),
                  ).length,
                  goal: user.dailyGoal,
                },
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
              <Card className="h-full flex items-center">
                <EmptyState
                  mascotState="happy"
                  title="Tudo em dia!"
                  description="Você não tem tarefas pendentes. Que tal criar uma nova?"
                  action={{ label: 'Nova Tarefa', onClick: openNewTask }}
                />
              </Card>
            )}
          </div>
          <div className="lg:col-span-1">
            <XpCard tasks={tasks}>
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
