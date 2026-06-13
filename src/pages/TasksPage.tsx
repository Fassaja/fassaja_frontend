import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskFilters } from '@/components/tasks/TaskFilters';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { EditTaskModal } from '@/components/tasks/EditTaskModal';
import { Card } from '@/components/common/Card';
import { Task, TaskStatus, TaskPriority } from '@/types/task';
import { useTasks } from '@/hooks/useTasks';
import { projectsService } from '@/services/projectsService';

const TasksPage: React.FC = () => {
  const { tasks, createTask, updateTask, completeTask, deleteTask } = useTasks();
  const [projects, setProjects] = React.useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [filterProject, setFilterProject] = useState<string | 'all'>('all');

  React.useEffect(() => {
    projectsService.getProjects().then(setProjects);
  }, []);

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setShowEditModal(true);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterPriority('all');
    setFilterProject('all');
  };

  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    overdue: tasks.filter(t => t.status === 'overdue').length,
  };

  return (
    <>
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateTask={createTask}
      />

      <EditTaskModal
        isOpen={showEditModal}
        task={selectedTask}
        onClose={() => {
          setShowEditModal(false);
          setSelectedTask(undefined);
        }}
        onUpdateTask={updateTask}
      />

      <AppLayout onNewTask={() => setShowCreateModal(true)}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Minhas Tarefas
          </h1>
          <p className="text-text-secondary">
            Gerencie todas as suas tarefas em um só lugar
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="text-center py-4">
            <p className="text-3xl font-bold text-text-primary">{taskStats.total}</p>
            <p className="text-sm text-text-secondary">Total</p>
          </Card>
          <Card className="text-center py-4">
            <p className="text-3xl font-bold text-primary-vibrant">{taskStats.pending}</p>
            <p className="text-sm text-text-secondary">Pendentes</p>
          </Card>
          <Card className="text-center py-4">
            <p className="text-3xl font-bold text-yellow-500">{taskStats.inProgress}</p>
            <p className="text-sm text-text-secondary">Em Andamento</p>
          </Card>
          <Card className="text-center py-4">
            <p className="text-3xl font-bold text-green-500">{taskStats.completed}</p>
            <p className="text-sm text-text-secondary">Concluídas</p>
          </Card>
          <Card className="text-center py-4">
            <p className="text-3xl font-bold text-red-500">{taskStats.overdue}</p>
            <p className="text-sm text-text-secondary">Atrasadas</p>
          </Card>
        </div>

        {/* Filters */}
        <TaskFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filterStatus={filterStatus}
          onStatusChange={setFilterStatus}
          filterPriority={filterPriority}
          onPriorityChange={setFilterPriority}
          filterProject={filterProject}
          onProjectChange={setFilterProject}
          projects={projects}
          onReset={handleResetFilters}
        />

        {/* Task List */}
        <div className="mt-8">
          <TaskList
            tasks={tasks}
            searchTerm={searchTerm}
            filterStatus={filterStatus}
            filterPriority={filterPriority}
            filterProject={filterProject}
            onComplete={completeTask}
            onDelete={deleteTask}
            onEdit={handleEditTask}
          />
        </div>
      </AppLayout>
    </>
  );
};

export default TasksPage;
