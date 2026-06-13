import React from 'react';
import { Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Task } from '@/types/task';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { formatDate } from '@/utils/date';

interface TaskCardProps {
  task: Task;
  onComplete?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onClick?: (task: Task) => void;
}

const statusConfig = {
  pending: { label: 'Pendente', variant: 'default' as const },
  in_progress: { label: 'Em Progresso', variant: 'info' as const },
  completed: { label: 'Concluída', variant: 'success' as const },
  overdue: { label: 'Atrasada', variant: 'danger' as const },
};

const priorityConfig = {
  low: { label: 'Baixa', emoji: '🟢' },
  medium: { label: 'Média', emoji: '🟡' },
  high: { label: 'Alta', emoji: '🔴' },
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onComplete,
  onDelete,
  onClick,
}) => {
  const isCompleted = task.status === 'completed';
  const statusInfo = statusConfig[task.status];
  const priorityInfo = priorityConfig[task.priority];

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
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={() => onComplete?.(task.id)}
          className="w-5 h-5 mt-1 rounded border-2 border-border cursor-pointer accent-primary-vibrant"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4
            className={`font-medium mb-1 ${isCompleted ? 'line-through text-text-secondary' : 'text-text-primary'}`}
          >
            {task.title}
          </h4>
          {task.description && (
            <p className="text-sm text-text-secondary line-clamp-2 mb-2">
              {task.description}
            </p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant={statusInfo.variant}>
              {statusInfo.label}
            </Badge>
            <Badge variant="default">
              {priorityInfo.emoji} {priorityInfo.label}
            </Badge>
            {task.dueDate && (
              <span className="text-xs text-text-secondary">
                📅 {formatDate(task.dueDate)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {onDelete && (
            <button
              onClick={e => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              className="p-2 hover:bg-red-50 rounded-lg text-danger transition-colors"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </Card>
    </motion.div>
  );
};
