import React from 'react';
import { Check } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Task } from '@/types/task';
import { Project } from '@/types/project';
import { formatDate, isToday, isTomorrow } from '@/utils/date';

interface UpcomingTasksProps {
  tasks: Task[];
  projects?: Project[];
  onComplete?: (taskId: string) => void;
}

const priorityBadge: Record<Task['priority'], { label: string; className: string }> = {
  high: { label: 'Alta', className: 'bg-purple-100 text-purple-700' },
  medium: { label: 'Média', className: 'bg-amber-100 text-amber-700' },
  low: { label: 'Baixa', className: 'bg-emerald-100 text-emerald-700' },
};

function dueBadge(task: Task) {
  if (!task.dueDate) return null;
  if (isToday(task.dueDate)) return { label: 'Hoje', className: 'bg-primary-light text-primary-vibrant' };
  if (isTomorrow(task.dueDate)) return { label: 'Amanhã', className: 'bg-emerald-50 text-emerald-600' };
  return { label: formatDate(task.dueDate), className: 'bg-bg-secondary text-text-secondary' };
}

export const UpcomingTasks: React.FC<UpcomingTasksProps> = ({ tasks, projects = [], onComplete }) => {
  return (
    <Card className="h-full">
      <h3 className="text-lg font-bold text-text-primary mb-4">Próximas Tarefas</h3>

      <ul className="divide-y divide-border">
        {tasks.map(task => {
          const completed = task.status === 'completed';
          const due = dueBadge(task);
          const priority = priorityBadge[task.priority];
          const project = projects.find(p => p.id === task.projectId);

          return (
            <li key={task.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <button
                onClick={() => onComplete?.(task.id)}
                aria-label={completed ? 'Tarefa concluída' : 'Marcar como concluída'}
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  completed
                    ? 'bg-success text-white'
                    : 'border-2 border-border hover:border-primary-vibrant'
                }`}
              >
                {completed && <Check size={13} strokeWidth={3} />}
              </button>

              {project && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: project.color }}
                  title={project.name}
                />
              )}

              <span
                className={`flex-1 min-w-0 truncate text-sm font-medium ${
                  completed ? 'line-through text-text-soft' : 'text-text-primary'
                }`}
              >
                {task.title}
              </span>

              {due && (
                <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${due.className}`}>
                  {due.label}
                </span>
              )}

              <span
                className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  completed ? 'bg-emerald-100 text-emerald-700' : priority.className
                }`}
              >
                {completed ? 'Concluída' : priority.label}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
};
