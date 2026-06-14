import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { TaskCard } from '@/components/tasks/TaskCard';
import { EmptyState } from '@/components/common/EmptyState';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { TaskPriority } from '@/types/task';

const PRIORITY_ORDER: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

const tabsConfig: { value: TaskPriority | 'all'; label: string; color: string }[] = [
  { value: 'all', label: 'Todas', color: '#2477FF' },
  { value: 'high', label: 'Alta', color: '#8B5CF6' },
  { value: 'medium', label: 'Média', color: '#FBBF24' },
  { value: 'low', label: 'Baixa', color: '#22C55E' },
];

const PrioritiesPage: React.FC = () => {
  const { tasks, completeTask, deleteTask } = useTasks();
  const { projects } = useProjects();
  const [filter, setFilter] = useState<TaskPriority | 'all'>('all');

  // Prioridades foca no que ainda está em aberto.
  const activeTasks = tasks.filter(t => t.status !== 'completed');

  const countFor = (value: TaskPriority | 'all') =>
    value === 'all' ? activeTasks.length : activeTasks.filter(t => t.priority === value).length;

  const visible = activeTasks
    .filter(t => filter === 'all' || t.priority === filter)
    .sort((a, b) => {
      if (PRIORITY_ORDER[a.priority] !== PRIORITY_ORDER[b.priority]) {
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      }
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  return (
    <AppLayout title="Prioridades" subtitle="Suas tarefas organizadas por nível de prioridade.">
      {/* Priority tabs (contagem + filtro) */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
        {tabsConfig.map(tab => {
          const active = filter === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-semibold transition-all active:scale-[0.97] ${
                active
                  ? 'border-transparent text-white shadow-sm'
                  : 'bg-white border-border text-text-secondary hover:bg-bg-secondary'
              }`}
              style={active ? { backgroundColor: tab.color } : undefined}
            >
              {tab.value !== 'all' && (
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: active ? 'rgba(255,255,255,0.9)' : tab.color }}
                />
              )}
              {tab.label}
              <span
                className={`min-w-[20px] text-center text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  active ? 'bg-white/25 text-white' : 'bg-bg-secondary text-text-secondary'
                }`}
              >
                {countFor(tab.value)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Lista */}
      {visible.length > 0 ? (
        <div className="space-y-3">
          {visible.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              project={projects.find(p => p.id === task.projectId)}
              onComplete={completeTask}
              onDelete={deleteTask}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          mascotState="happy"
          title="Nada por aqui!"
          description="Você não tem tarefas em aberto com esse nível de prioridade."
        />
      )}
    </AppLayout>
  );
};

export default PrioritiesPage;
