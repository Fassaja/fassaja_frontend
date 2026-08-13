import React from 'react';
import { Flag } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageTour } from '@/components/onboarding/PageTour';
import { TaskCard } from '@/components/tasks/TaskCard';
import { AnimatedList } from '@/components/common/AnimatedList';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useDeferredLoading } from '@/hooks/useDeferredLoading';

const PrioritiesPage: React.FC = () => {
  const { tasks, completeTask, deleteTask, loading } = useTasks();
  const showSkeleton = useDeferredLoading(loading);
  const { projects } = useProjects();

  // Só prioridade alta em aberto, ordenada pelo prazo mais próximo.
  const highTasks = tasks
    .filter(t => t.priority === 'high' && t.status !== 'completed')
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  return (
    <AppLayout title="Prioridades" subtitle="O que é prioridade alta e ainda está em aberto.">
      <PageTour id="priorities" />
      {loading ? (showSkeleton ? <LoadingScreen /> : null) : <>
      {highTasks.length > 0 ? (
        <>
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-priority-high">
              <Flag size={18} />
            </span>
            <div>
              <p className="font-bold text-text-primary leading-tight">Prioridade alta</p>
              <p className="text-xs text-text-secondary">
                {highTasks.length} tarefa{highTasks.length === 1 ? '' : 's'} para resolver primeiro
              </p>
            </div>
          </div>

          {/* Aqui a saída é definitiva: concluir tira a tarefa da lista (o
              filtro é "alta E em aberto"), diferente da aba Tarefas, onde ela
              só muda de grupo. */}
          <AnimatedList
            items={highTasks}
            className="space-y-3"
            renderItem={task => (
              <TaskCard
                task={task}
                project={projects.find(p => p.id === task.projectId)}
                onComplete={completeTask}
                onDelete={deleteTask}
              />
            )}
          />
        </>
      ) : (
        <EmptyState
          mascotState="happy"
          title="Nenhuma prioridade alta!"
          description="Você não tem tarefas de prioridade alta em aberto. Tudo sob controle."
        />
      )}
      </>}
    </AppLayout>
  );
};

export default PrioritiesPage;
