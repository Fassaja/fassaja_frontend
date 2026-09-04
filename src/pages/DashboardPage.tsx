import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
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
import { useTaskHistory } from '@/hooks/useTaskHistory';
import { diaISO, inicioDaSemana, resumoSemanal } from '@/utils/produtividade';

/**
 * Entrada de cada região, em cascata de cima para baixo.
 *
 * Não é enfeite: a página foi reorganizada por prioridade — atenção de hoje,
 * números, o que fazer agora, como a semana vai, constância — e a cascata
 * ENCENA essa ordem, em vez de despejar tudo de uma vez e deixar o olho
 * procurar por onde começar. Respeita "reduzir movimento" pelo MotionConfig
 * do App.
 */
const REGIAO = {
  hidden: { opacity: 0, y: 12 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

const DashboardPage: React.FC = () => {
  const { tasks, completeTask, createTask, loading } = useTasks();
  const showSkeleton = useDeferredLoading(loading);
  const { projects } = useProjects();
  const { user } = useUser();
  const { isGuest, guestTaskCount, guestTaskLimit, requireAuth } = useAuth();
  /*
   * Semana a partir do histórico do servidor.
   *
   * A faxina apaga tarefas concluídas depois de 4 dias, então qualquer número
   * de semana somado a partir da lista encolhe sozinho no meio da semana. Uma
   * busca só, cobrindo a semana passada e a atual — é o que a comparação e a
   * meta precisam.
   */
  const [deSemana, ateSemana] = useMemo(() => {
    const hoje = new Date();
    const segunda = inicioDaSemana(hoje);
    const anterior = new Date(segunda);
    anterior.setDate(segunda.getDate() - 7);
    return [diaISO(anterior), diaISO(hoje)];
  }, []);
  const { porDia: historicoSemana } = useTaskHistory(deSemana, ateSemana);
  const semana = useMemo(() => resumoSemanal(historicoSemana, new Date()), [historicoSemana]);

  const stats = useDashboardStats(tasks, semana);
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
        {loading ? (showSkeleton ? <DashboardSkeleton /> : null) : (
        <motion.div
          initial="hidden"
          animate="shown"
          variants={{ shown: { transition: { staggerChildren: 0.07 } } }}
        >
        <motion.div variants={REGIAO}>
        <TodayFocus
          overdue={stats.overdue}
          dueToday={dueToday}
          completedToday={completedToday}
          totalTasks={stats.total}
          onNewTask={openNewTask}
        />
        </motion.div>

        <motion.div variants={REGIAO}>
        <StatStrip
          variant="plain"
          className="mb-12"
          stats={[
            { label: 'Total', value: stats.total, comparison: stats.comparisons.total },
            { label: 'Concluídas', value: stats.completed, comparison: stats.comparisons.completed },
            { label: 'Em andamento', value: stats.inProgress, comparison: stats.comparisons.inProgress },
            { label: 'Atrasadas', value: stats.overdue, comparison: stats.comparisons.overdue, alert: true },
          ]}
        />
        </motion.div>

        {/*
          A ordem das regiões é a ordem das perguntas: primeiro O QUE FAZER
          AGORA, depois COMO A SEMANA ESTÁ INDO, por último a CONSTÂNCIA.

          A lista de tarefas ocupava a largura inteira, e isso a deixava OCA:
          o título terminava a 180px da margem esquerda e as etiquetas de data
          e prioridade eram empurradas para 1000px dali, com um vão morto de
          uns 800px no meio de cada linha. Largura inteira só serve para quem
          preenche a largura inteira — o gráfico, que é o caso. A lista voltou
          para dois terços, com o progresso ocupando o terço restante, e o
          conteúdo de cada linha voltou a ficar perto de si mesmo.

          A separação entre elas é ESPAÇO, e não linha. Tinha um filete de
          ponta a ponta antes de cada região, e ele dizia a mesma coisa que o
          rótulo em caixa alta logo abaixo já dizia — duas marcas para uma
          fronteira só. Somadas às barras entre os números e às linhas entre as
          tarefas, a tela virava uma grade de filetes que o olho tinha de
          atravessar. Espaço separa sem desenhar nada.
        */}
        <motion.div variants={REGIAO} className="grid grid-cols-1 gap-10 lg:grid-cols-3">
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
            <ProgressCard
              percentage={stats.completionRate}
              goals={{
                daily: { done: completedToday, goal: user.dailyGoal },
                // Do histórico do servidor, não das tarefas na tela.
                //
                // Contando as vivas, a barra ANDAVA PARA TRÁS: quem concluía
                // 20 na segunda via o número cair na sexta, quando a faxina
                // apagava as de segunda. Uma meta que desanda sozinha é pior
                // do que não ter meta.
                weekly: { done: semana.estaSemana, goal: user.weeklyGoal },
              }}
            />
          </div>
        </motion.div>

        {/* O gráfico é o único bloco que de fato PREENCHE a largura inteira:
            mais espaço nele é mais dias visíveis, não mais vão. */}
        <motion.div variants={REGIAO} className="mt-12">
          <WeeklyOverviewChart />
        </motion.div>

        <motion.div
          variants={REGIAO}
          className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2"
        >
          <XpCard />
          <div>
            <StreakContent />
          </div>
        </motion.div>
        </motion.div>
        )}
      </AppLayout>
    </>
  );
};

export default DashboardPage;
