import React from 'react';
import { Project } from '@/types/project';
import { Card } from '@/components/common/Card';
import { Edit, Trash2 } from 'lucide-react';

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
  const progressPercent = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

  return (
    <Card hoverable className="group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <h3 className="font-bold text-text-primary">
            {project.name}
          </h3>
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={() => onEdit(project)}
              className="p-2 hover:bg-blue-50 rounded-lg text-primary-vibrant transition-colors"
            >
              <Edit size={16} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(project.id)}
              className="p-2 hover:bg-red-50 rounded-lg text-danger transition-colors"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {project.description && (
        <p className="text-sm text-text-secondary mb-4 line-clamp-2">
          {project.description}
        </p>
      )}

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-text-secondary">
            Progresso
          </span>
          <span className="text-xs font-bold text-text-primary">
            {progressPercent}%
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full transition-all"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: project.color,
            }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-xs text-text-secondary">
        <span>{taskCount} tarefas</span>
        <span>•</span>
        <span>{completedCount} concluídas</span>
      </div>
    </Card>
  );
};
