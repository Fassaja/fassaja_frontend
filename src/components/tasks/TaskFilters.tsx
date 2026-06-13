import React from 'react';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Card } from '@/components/common/Card';
import { TaskStatus, TaskPriority } from '@/types/task';
import { Search, X } from 'lucide-react';

interface TaskFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterStatus: TaskStatus | 'all';
  onStatusChange: (value: TaskStatus | 'all') => void;
  filterPriority: TaskPriority | 'all';
  onPriorityChange: (value: TaskPriority | 'all') => void;
  filterProject: string | 'all';
  onProjectChange: (value: string | 'all') => void;
  projects: any[];
  onReset: () => void;
}

const statusOptions = [
  { value: 'all', label: 'Todos os Status' },
  { value: 'pending', label: 'Pendente' },
  { value: 'in_progress', label: 'Em Progresso' },
  { value: 'completed', label: 'Concluída' },
  { value: 'overdue', label: 'Atrasada' },
];

const priorityOptions = [
  { value: 'all', label: 'Todas as Prioridades' },
  { value: 'low', label: '🟢 Baixa' },
  { value: 'medium', label: '🟡 Média' },
  { value: 'high', label: '🔴 Alta' },
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
    { value: 'all', label: 'Todos os Projetos' },
    ...projects.map(p => ({ value: p.id, label: p.name })),
  ];

  const hasActiveFilters =
    searchTerm !== '' ||
    filterStatus !== 'all' ||
    filterPriority !== 'all' ||
    filterProject !== 'all';

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-text-primary">Filtros</h3>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-2 text-sm text-primary-vibrant hover:text-blue-600 transition-colors"
          >
            <X size={16} />
            Limpar filtros
          </button>
        )}
      </div>

      {/* Search */}
      <Input
        placeholder="Buscar tarefas..."
        value={searchTerm}
        onChange={e => onSearchChange(e.target.value)}
        icon={<Search size={18} />}
      />

      {/* Filters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          label="Status"
          options={statusOptions}
          value={filterStatus}
          onChange={e => onStatusChange(e.target.value as TaskStatus | 'all')}
        />

        <Select
          label="Prioridade"
          options={priorityOptions}
          value={filterPriority}
          onChange={e => onPriorityChange(e.target.value as TaskPriority | 'all')}
        />

        <Select
          label="Projeto"
          options={projectOptions}
          value={filterProject}
          onChange={e => onProjectChange(e.target.value)}
        />
      </div>
    </Card>
  );
};
