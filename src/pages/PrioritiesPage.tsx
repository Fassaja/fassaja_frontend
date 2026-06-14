import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/common/Card';
import { TaskCard } from '@/components/tasks/TaskCard';
import { Mascot } from '@/components/mascot/Mascot';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { TaskPriority } from '@/types/task';

const COLUMNS: { key: TaskPriority; label: string; color: string }[] = [
  { key: 'high', label: 'Alta', color: '#8B5CF6' },
  { key: 'medium', label: 'Média', color: '#FBBF24' },
  { key: 'low', label: 'Baixa', color: '#22C55E' },
];

const PrioritiesPage: React.FC = () => {
  const { tasks, completeTask, deleteTask } = useTasks();
  const { projects } = useProjects();

  return (
    <AppLayout title="Prioridades" subtitle="Suas tarefas organizadas por nível de prioridade.">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.priority === col.key && t.status !== 'completed');
          return (
            <section key={col.key} className="flex flex-col gap-3">
              <div className="flex items-center gap-2 px-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                <h2 className="font-bold text-text-primary">{col.label}</h2>
                <span className="ml-auto text-sm text-text-secondary">{colTasks.length}</span>
              </div>

              {colTasks.length > 0 ? (
                colTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    project={projects.find(p => p.id === task.projectId)}
                    onComplete={completeTask}
                    onDelete={deleteTask}
                  />
                ))
              ) : (
                <Card className="flex flex-col items-center text-center py-8">
                  <Mascot state="confused" size="sm" animate={true} />
                  <p className="text-sm text-text-secondary mt-3">Nenhuma tarefa aqui.</p>
                </Card>
              )}
            </section>
          );
        })}
      </div>
    </AppLayout>
  );
};

export default PrioritiesPage;
