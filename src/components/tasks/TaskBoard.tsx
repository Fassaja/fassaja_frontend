import React, { useMemo } from 'react';
import { Task, TaskStatus, TaskPriority } from '@/types/task';
import { Project } from '@/types/project';
import { TaskCard } from './TaskCard';
import { EmptyState } from '@/components/common/EmptyState';

interface TaskBoardProps {
  tasks: Task[];
  projects?: Project[];
  onComplete?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onEdit?: (task: Task) => void;
  searchTerm?: string;
  filterPriority?: TaskPriority | 'all';
  filterProject?: string | 'all';
}

type ColumnKey = 'pending' | 'in_progress' | 'completed';

// Colunas do quadro. "overdue" (calculado no servidor) entra em Pendente:
// é uma tarefa não concluída, só que atrasada — o card já mostra o badge vermelho.
const COLUMNS: {
  key: ColumnKey;
  label: string;
  hint: string;
  color: string;
  tint: string;
  statuses: TaskStatus[];
}[] = [
  {
    key: 'pending',
    label: 'Pendente',
    hint: 'Ainda não começou',
    color: '#64748B',
    tint: 'bg-slate-50',
    statuses: ['pending', 'overdue'],
  },
  {
    key: 'in_progress',
    label: 'Em andamento',
    hint: 'Em execução agora',
    color: '#2477FF',
    tint: 'bg-primary-light/50',
    statuses: ['in_progress'],
  },
  {
    key: 'completed',
    label: 'Concluída',
    hint: 'Já finalizou 🎉',
    color: '#22C55E',
    tint: 'bg-emerald-50',
    statuses: ['completed'],
  },
];

export const TaskBoard: React.FC<TaskBoardProps> = ({
  tasks,
  projects = [],
  onComplete,
  onDelete,
  onEdit,
  searchTerm = '',
  filterPriority = 'all',
  filterProject = 'all',
}) => {
  const filtered = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      const matchesProject = filterProject === 'all' || task.projectId === filterProject;
      return matchesSearch && matchesPriority && matchesProject;
    });
  }, [tasks, searchTerm, filterPriority, filterProject]);

  const columns = useMemo(() => {
    return COLUMNS.map(col => ({
      ...col,
      items: filtered.filter(t => col.statuses.includes(t.status)),
    }));
  }, [filtered]);

  if (filtered.length === 0) {
    return (
      <EmptyState
        mascotState="confused"
        title="Nenhuma tarefa encontrada"
        description="Ajuste seus filtros ou crie uma nova tarefa para começar"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {columns.map(col => (
        <section
          key={col.key}
          className="flex flex-col rounded-2xl border border-border bg-bg-secondary/60"
        >
          {/* Cabeçalho da coluna */}
          <header className="flex items-center gap-2 px-4 pt-4 pb-3">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-text-primary">{col.label}</h3>
                <span className="text-xs font-bold text-text-secondary bg-white rounded-full px-2 py-0.5 border border-border">
                  {col.items.length}
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">{col.hint}</p>
            </div>
          </header>

          {/* Corpo da coluna */}
          <div className={`flex-1 space-y-3 px-3 pb-3 rounded-b-2xl ${col.tint}`}>
            <div className="pt-3 space-y-3">
              {col.items.length > 0 ? (
                col.items.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    project={projects.find(p => p.id === task.projectId)}
                    onComplete={onComplete}
                    onDelete={onDelete}
                    onClick={onEdit}
                  />
                ))
              ) : (
                <p className="text-center text-xs text-text-soft py-8 px-2">
                  Nada por aqui ainda.
                  <br />
                  Use o status de um card para mover pra cá.
                </p>
              )}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
};
