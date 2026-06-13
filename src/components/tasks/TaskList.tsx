import React, { useMemo } from 'react';
import { Task, TaskStatus, TaskPriority } from '@/types/task';
import { TaskCard } from './TaskCard';
import { EmptyState } from '@/components/common/EmptyState';

interface TaskListProps {
  tasks: Task[];
  onComplete?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onEdit?: (task: Task) => void;
  searchTerm?: string;
  filterStatus?: TaskStatus | 'all';
  filterPriority?: TaskPriority | 'all';
  filterProject?: string | 'all';
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onComplete,
  onDelete,
  onEdit,
  searchTerm = '',
  filterStatus = 'all',
  filterPriority = 'all',
  filterProject = 'all',
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
    <div className="space-y-3">
      {filteredTasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          onComplete={onComplete}
          onDelete={onDelete}
          onClick={onEdit}
        />
      ))}
    </div>
  );
};
