import React from 'react';
import { Trash2, Check, CalendarDays, Send, UserCheck, UserX } from 'lucide-react';
import { motion } from 'framer-motion';
import { Task } from '@/types/task';
import { Project } from '@/types/project';
import { Card } from '@/components/common/Card';
import { formatDate } from '@/utils/date';
import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/hooks/useTasks';

interface TaskCardProps {
  task: Task;
  project?: Project;
  onComplete?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onClick?: (task: Task) => void;
}

const statusConfig: Record<Task['status'], { label: string; className: string }> = {
  pending: { label: 'Pendente', className: 'bg-slate-100 text-slate-600' },
  in_progress: { label: 'Em andamento', className: 'bg-primary-light text-primary-vibrant' },
  completed: { label: 'Concluída', className: 'bg-emerald-100 text-emerald-700' },
  overdue: { label: 'Atrasada', className: 'bg-rose-100 text-rose-600' },
};

const priorityConfig: Record<Task['priority'], { label: string; color: string; className: string }> = {
  low: { label: 'Baixa', color: '#22C55E', className: 'bg-emerald-50 text-emerald-700' },
  medium: { label: 'Média', color: '#FBBF24', className: 'bg-amber-50 text-amber-700' },
  high: { label: 'Alta', color: '#8B5CF6', className: 'bg-purple-50 text-purple-700' },
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  project,
  onComplete,
  onDelete,
  onClick,
}) => {
  const { account } = useAuth();
  const { respondAssignment } = useTasks();
  const isCompleted = task.status === 'completed';
  const statusInfo = statusConfig[task.status];
  const priorityInfo = priorityConfig[task.priority];

  const isMyProposal =
    !!account && task.assigneeId === account.id && task.assignmentStatus === 'pending';

  const assignment =
    task.assigneeId && task.assigneeName
      ? task.assignmentStatus === 'accepted'
        ? { label: task.assigneeName, className: 'bg-emerald-50 text-emerald-700', icon: <UserCheck size={13} /> }
        : task.assignmentStatus === 'rejected'
        ? { label: `${task.assigneeName} recusou`, className: 'bg-rose-50 text-rose-600', icon: <UserX size={13} /> }
        : { label: `Proposta: ${task.assigneeName}`, className: 'bg-amber-50 text-amber-700', icon: <Send size={12} /> }
      : null;

  const respond = (e: React.MouseEvent, action: 'accept' | 'reject') => {
    e.stopPropagation();
    if (account) respondAssignment(task.id, action);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        hoverable
        onClick={() => onClick?.(task)}
        className="flex items-start gap-4 group"
      >
        {/* Checkbox */}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onComplete?.(task.id);
          }}
          aria-label={isCompleted ? 'Tarefa concluída' : 'Marcar como concluída'}
          className={`w-6 h-6 mt-0.5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
            isCompleted
              ? 'bg-success text-white'
              : 'border-2 border-border hover:border-primary-vibrant'
          }`}
        >
          {isCompleted && <Check size={15} strokeWidth={3} />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4
            className={`font-semibold mb-1 ${isCompleted ? 'line-through text-text-soft' : 'text-text-primary'}`}
          >
            {task.title}
          </h4>
          {task.description && (
            <p className="text-sm text-text-secondary line-clamp-2 mb-3">
              {task.description}
            </p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusInfo.className}`}>
              {statusInfo.label}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${priorityInfo.className}`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: priorityInfo.color }} />
              {priorityInfo.label}
            </span>
            {project && (
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full text-text-primary"
                style={{ backgroundColor: project.color + '1A' }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
                {project.name}
              </span>
            )}
            {task.dueDate && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                <CalendarDays size={14} className="text-text-soft" />
                {formatDate(task.dueDate)}
              </span>
            )}
            {assignment && (
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${assignment.className}`}
              >
                {assignment.icon}
                {assignment.label}
              </span>
            )}
          </div>

          {/* Proposta de tarefa para o usuário atual */}
          {isMyProposal && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2">
              <span className="text-xs font-semibold text-amber-700 flex-1 min-w-0">
                Esta tarefa foi proposta a você.
              </span>
              <button
                onClick={e => respond(e, 'accept')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-success text-white hover:bg-emerald-600 active:scale-95 transition-all"
              >
                Aceitar
              </button>
              <button
                onClick={e => respond(e, 'reject')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-border text-danger hover:bg-rose-50 active:scale-95 transition-all"
              >
                Recusar
              </button>
            </div>
          )}
        </div>

        {/* Actions (always tappable on touch, hover-reveal on desktop) */}
        <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {onDelete && (
            <button
              onClick={e => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              aria-label="Excluir tarefa"
              className="p-2 hover:bg-rose-50 rounded-lg text-danger transition-colors"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </Card>
    </motion.div>
  );
};
