import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/common/Input';
import { Dropdown } from '@/components/common/Dropdown';
import { Card } from '@/components/common/Card';
import { OptionSelector, SelectableOption } from '@/components/common/OptionSelector';
import { TaskStatus, TaskPriority } from '@/types/task';
import { Project } from '@/types/project';

interface TaskFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterStatus: TaskStatus | 'all';
  onStatusChange: (value: TaskStatus | 'all') => void;
  filterPriority: TaskPriority | 'all';
  onPriorityChange: (value: TaskPriority | 'all') => void;
  filterProject: string | 'all';
  onProjectChange: (value: string | 'all') => void;
  projects: Project[];
  onReset: () => void;
}

const statusOptions: SelectableOption[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendentes', color: '#64748B' },
  { value: 'in_progress', label: 'Em andamento', color: '#2477FF' },
  { value: 'completed', label: 'Concluídas', color: '#22C55E' },
  { value: 'overdue', label: 'Atrasadas', color: '#F43F5E' },
];

const priorityOptions: SelectableOption[] = [
  { value: 'all', label: 'Todas' },
  { value: 'low', label: 'Baixa', color: '#22C55E', dot: true },
  { value: 'medium', label: 'Média', color: '#FBBF24', dot: true },
  { value: 'high', label: 'Alta', color: '#8B5CF6', dot: true },
];

export const TaskFilters: React.FC<TaskFiltersProps> = ({
  searchTerm,
  onSearchChange,
  filterStatus,
  onStatusChange,
  filterPriority,
  onPriorityChange,
  filterProject,
  onProjectChange,
  projects,
  onReset,
}) => {
  const projectOptions = [
    { value: 'all', label: 'Todos os projetos' },
    ...projects.map(p => ({ value: p.id, label: p.name })),
  ];

  const hasActiveFilters =
    searchTerm !== '' ||
    filterStatus !== 'all' ||
    filterPriority !== 'all' ||
    filterProject !== 'all';

  return (
    <Card className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-text-primary">Filtros</h3>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-vibrant hover:text-primary-hover transition-colors"
          >
            <X size={16} />
            Limpar filtros
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
        <div className="flex-1">
          <Input
            label="Buscar"
            placeholder="Buscar por título..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            icon={<Search size={18} />}
          />
        </div>
        <div className="lg:w-64">
          <Dropdown
            label="Projeto"
            options={projectOptions}
            value={filterProject}
            onChange={onProjectChange}
            fullWidth
          />
        </div>
      </div>

      <OptionSelector
        label="Status"
        options={statusOptions}
        value={filterStatus}
        onChange={v => onStatusChange(v as TaskStatus | 'all')}
      />

      <OptionSelector
        label="Prioridade"
        options={priorityOptions}
        value={filterPriority}
        onChange={v => onPriorityChange(v as TaskPriority | 'all')}
      />
    </Card>
  );
};
