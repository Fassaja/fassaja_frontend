import React, { useMemo } from 'react';
import { Task, TaskStatus, TaskPriority } from '@/types/task';
import { Project } from '@/types/project';
import { TaskCard } from './TaskCard';
import { EmptyState } from '@/components/common/EmptyState';
import { isToday, isTomorrow } from '@/utils/date';

interface TaskListProps {
  tasks: Task[];
  projects?: Project[];
  onComplete?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onEdit?: (task: Task) => void;
  searchTerm?: string;
  filterStatus?: TaskStatus | 'all';
  filterPriority?: TaskPriority | 'all';
  filterProject?: string | 'all';
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (taskId: string) => void;
}

type GroupKey = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'nodate' | 'completed';

// Seções na ordem de exibição, com rótulo e marcador. A cor vem por CLASSE do
// tema: os hex que estavam aqui eram os tons do tema claro e não acompanhavam
// a troca para o escuro.
const GROUPS: { key: GroupKey; label: string; dot: string }[] = [
  { key: 'overdue', label: 'Atrasadas', dot: 'bg-danger' },
  { key: 'today', label: 'Hoje', dot: 'bg-primary-vibrant' },
  { key: 'tomorrow', label: 'Amanhã', dot: 'bg-success' },
  { key: 'week', label: 'Próximos 7 dias', dot: 'bg-warning' },
  { key: 'later', label: 'Mais tarde', dot: 'bg-priority-high' },
  { key: 'nodate', label: 'Sem data', dot: 'bg-text-soft' },
  { key: 'completed', label: 'Concluídas', dot: 'bg-success' },
];

function bucketOf(task: Task): GroupKey {
  if (task.status === 'completed') return 'completed';
  if (task.status === 'overdue') return 'overdue';
  if (!task.dueDate) return 'nodate';
  if (isToday(task.dueDate)) return 'today';
  if (isTomorrow(task.dueDate)) return 'tomorrow';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${task.dueDate}T00:00:00`);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
  return diffDays <= 7 ? 'week' : 'later';
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  projects = [],
  onComplete,
  onDelete,
  onEdit,
  searchTerm = '',
  filterStatus = 'all',
  filterPriority = 'all',
  filterProject = 'all',
  selectionMode = false,
  selectedIds,
  onToggleSelect,
}) => {
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      const matchesProject = filterProject === 'all' || task.projectId === filterProject;

      return matchesSearch && matchesStatus && matchesPriority && matchesProject;
    });
  }, [tasks, searchTerm, filterStatus, filterPriority, filterProject]);

  const grouped = useMemo(() => {
    const map: Record<GroupKey, Task[]> = {
      overdue: [],
      today: [],
      tomorrow: [],
      week: [],
      later: [],
      nodate: [],
      completed: [],
    };
    filteredTasks.forEach(task => map[bucketOf(task)].push(task));
    return map;
  }, [filteredTasks]);

  if (filteredTasks.length === 0) {
    return (
      <EmptyState
        mascotState="confused"
        title="Nenhuma tarefa encontrada"
        description="Ajuste seus filtros ou crie uma nova tarefa para começar"
      />
    );
  }

  return (
    <div className="space-y-7">
      {GROUPS.map(group => {
        const items = grouped[group.key];
        if (items.length === 0) return null;

        return (
          <section key={group.key} className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <span className={`w-2.5 h-2.5 rounded-full ${group.dot}`} />
              <h3 className="text-sm font-bold text-text-primary">{group.label}</h3>
              <span className="text-xs font-semibold text-text-secondary bg-bg-secondary rounded-full px-2 py-0.5">
                {items.length}
              </span>
            </div>

            <div className="space-y-3">
              {items.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  project={projects.find(p => p.id === task.projectId)}
                  onComplete={onComplete}
                  onDelete={onDelete}
                  onClick={onEdit}
                  selectionMode={selectionMode}
                  selected={selectedIds?.has(task.id)}
                  onToggleSelect={onToggleSelect}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};
