import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/common/Input';
import { Dropdown } from '@/components/common/Dropdown';
import { Card } from '@/components/common/Card';
import { TaskPriority } from '@/types/task';
import { Project } from '@/types/project';

interface TaskFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterPriority: TaskPriority | 'all';
  onPriorityChange: (value: TaskPriority | 'all') => void;
  filterProject: string | 'all';
  onProjectChange: (value: string | 'all') => void;
  projects: Project[];
  hasActiveFilters: boolean;
  onReset: () => void;
}

const priorityOptions = [
  { value: 'all', label: 'Todas as prioridades' },
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
];

export const TaskFilters: React.FC<TaskFiltersProps> = ({
  searchTerm,
  onSearchChange,
  filterPriority,
  onPriorityChange,
  filterProject,
  onProjectChange,
  projects,
  hasActiveFilters,
  onReset,
}) => {
  const projectOptions = [
    { value: 'all', label: 'Todos os projetos' },
    ...projects.map(p => ({ value: p.id, label: p.name })),
  ];

  return (
    <Card padding="sm" className="flex flex-col lg:flex-row gap-3 lg:items-center">
      <div className="flex-1">
        <Input
          placeholder="Buscar por título..."
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
          icon={<Search size={18} />}
        />
      </div>
      <div className="flex gap-3">
        <div className="flex-1 lg:w-44">
          <Dropdown
            options={projectOptions}
            value={filterProject}
            onChange={onProjectChange}
            fullWidth
          />
        </div>
        <div className="flex-1 lg:w-44">
          <Dropdown
            options={priorityOptions}
            value={filterPriority}
            onChange={v => onPriorityChange(v as TaskPriority | 'all')}
            fullWidth
          />
        </div>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            aria-label="Limpar filtros"
            className="shrink-0 inline-flex items-center gap-1.5 px-3 rounded-xl border border-border text-sm font-medium text-text-secondary hover:text-danger hover:border-danger/40 transition-colors"
          >
            <X size={16} />
            <span className="hidden sm:inline">Limpar</span>
          </button>
        )}
      </div>
    </Card>
  );
};
