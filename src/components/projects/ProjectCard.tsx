import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Trash2, FolderOpen, ArrowRight } from 'lucide-react';
import { Project } from '@/types/project';
import { Card } from '@/components/common/Card';
import { formatDate } from '@/utils/date';

interface ProjectCardProps {
  project: Project;
  taskCount?: number;
  completedCount?: number;
  onEdit?: (project: Project) => void;
  onDelete?: (projectId: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  taskCount = 0,
  completedCount = 0,
  onEdit,
  onDelete,
}) => {
  const navigate = useNavigate();
  const progressPercent = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

  return (
    <Card
      hoverable
      className="group flex flex-col"
      style={{ backgroundColor: project.color + '12', borderColor: project.color + '40' }}
    >
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: project.color + '26', color: project.color }}
        >
          <FolderOpen size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-text-primary truncate">{project.name}</h3>
          <p className="text-xs text-text-soft">Criado em {formatDate(project.createdAt)}</p>
        </div>
        <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={() => onEdit(project)}
              aria-label="Editar projeto"
              className="p-2 hover:bg-primary-light rounded-lg text-primary-vibrant transition-colors"
            >
              <Edit size={15} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(project.id)}
              aria-label="Excluir projeto"
              className="p-2 hover:bg-rose-50 rounded-lg text-danger transition-colors"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {project.description && (
        <p className="text-sm text-text-secondary mb-4 line-clamp-2">{project.description}</p>
      )}

      {/* Progress */}
      <div className="mb-4 mt-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-text-secondary">Progresso</span>
          <span className="text-xs font-bold text-text-primary">{progressPercent}%</span>
        </div>
        <div
          className="w-full h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: project.color + '26' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%`, backgroundColor: project.color }}
          />
        </div>
        <div className="flex gap-3 text-xs text-text-secondary mt-2">
          <span><span className="font-semibold text-text-primary">{taskCount}</span> tarefas</span>
          <span className="text-border">•</span>
          <span><span className="font-semibold text-text-primary">{completedCount}</span> concluídas</span>
        </div>
      </div>

      <button
        onClick={() => navigate('/tasks')}
        className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-border bg-white/70 text-sm font-semibold text-text-primary hover:bg-white transition-colors"
      >
        Ver tarefas
        <ArrowRight size={16} />
      </button>
    </Card>
  );
};
