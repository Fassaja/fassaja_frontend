import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, AlertCircle, ListTodo } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ProgressCard } from '@/components/dashboard/ProgressCard';
import { TaskCard } from '@/components/tasks/TaskCard';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { MascotMessage } from '@/components/mascot/MascotMessage';
import { useTasks } from '@/hooks/useTasks';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { mockUser } from '@/data/mockUser';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { tasks, completeTask, deleteTask, createTask } = useTasks();
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

  const getProgressMessage = () => {
    const { completionRate } = stats;
    if (completionRate === 100) return 'Tudo concluído! Você venceu o dia.';
    if (completionRate >= 75) return 'Você está arrasando nas suas tarefas! 💪';
    if (completionRate >= 50) return 'Bom progresso! Vamos continuar?';
    if (completionRate > 0) return 'Cada tarefa conta. Continue!';
    return 'Nenhuma tarefa concluída ainda. Vamos começar?';
  };

  return (
    <>
      <CreateTaskModal
        isOpen={showNewTaskModal}
        onClose={() => setShowNewTaskModal(false)}
        onCreateTask={createTask}
      />

      <AppLayout onNewTask={() => setShowNewTaskModal(true)}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          Olá, {mockUser.name}! 👋
        </h1>
        <p className="text-text-secondary">
          Que bom te ver por aqui. Vamos ser produtivos hoje?
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total de Tarefas"
          value={stats.total}
          icon={<ListTodo size={24} />}
          color="#2477FF"
          comparison={{
            value: 12,
            isPositive: true,
            period: 'semana passada',
          }}
        />
        <MetricCard
          title="Concluídas"
          value={stats.completed}
          icon={<CheckCircle size={24} />}
          color="#22C55E"
          comparison={{
            value: 18,
            isPositive: true,
            period: 'semana passada',
          }}
        />
        <MetricCard
          title="Em Andamento"
          value={stats.inProgress}
          icon={<Clock size={24} />}
          color="#FBBF24"
          comparison={{
            value: 5,
            isPositive: false,
            period: 'semana passada',
          }}
        />
        <MetricCard
          title="Atrasadas"
          value={stats.overdue}
          icon={<AlertCircle size={24} />}
          color="#F43F5E"
          comparison={{
            value: 2,
            isPositive: false,
            period: 'semana passada',
          }}
        />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Progress */}
        <div className="lg:col-span-1">
          <ProgressCard
            percentage={stats.completionRate}
            label="Conclusão Geral"
            message={getProgressMessage()}
          />
        </div>

        {/* Upcoming Tasks */}
        <div className="lg:col-span-2">
          {upcomingTasks.length > 0 ? (
            <Card>
              <h3 className="text-lg font-bold text-text-primary mb-4">
                Próximas Tarefas
              </h3>
              <div className="space-y-3">
                {upcomingTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={completeTask}
                    onDelete={deleteTask}
                  />
                ))}
              </div>
            </Card>
          ) : (
            <EmptyState
              mascotState="happy"
              title="Nenhuma tarefa pendente!"
              description="Você está em dia com todas as suas tarefas. Aproveite e crie novas metas!"
              action={{
                label: 'Nova Tarefa',
                onClick: () => setShowNewTaskModal(true),
              }}
            />
          )}
        </div>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick actions */}
        <Card>
          <h3 className="text-lg font-bold text-text-primary mb-4">
            Atalhos Rápidos
          </h3>
          <div className="space-y-2">
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => setShowNewTaskModal(true)}
            >
              ➕ Nova Tarefa
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => navigate('/projects')}
            >
              📁 Novo Projeto
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => navigate('/reports')}
            >
              📊 Ver Relatórios
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => navigate('/calendar')}
            >
              📅 Calendário
            </Button>
          </div>
        </Card>

        {/* Help - Mascot Message */}
        <MascotMessage
          state="confused"
          title="Precisa de ajuda?"
          message="Fale conosco no chat de suporte. Estamos aqui para ajudar você a ser mais produtivo!"
          mascotSize="md"
          action={{
            label: 'Fale conosco',
            onClick: () => alert('Chat de suporte em breve!'),
          }}
        />
      </div>
    </AppLayout>
    </>
  );
};

export default DashboardPage;
