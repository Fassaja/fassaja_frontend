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

      <AppLayout
        onNewTask={() => setShowCreateModal(true)}
        title="Minhas Tarefas"
        subtitle="Gerencie todas as suas tarefas em um só lugar."
      >
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Total', value: taskStats.total, color: '#2477FF' },
            { label: 'Pendentes', value: taskStats.pending, color: '#64748B' },
            { label: 'Em andamento', value: taskStats.inProgress, color: '#FBBF24' },
            { label: 'Concluídas', value: taskStats.completed, color: '#22C55E' },
            { label: 'Atrasadas', value: taskStats.overdue, color: '#F43F5E' },
          ].map(stat => (
            <Card key={stat.label} className="py-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stat.color }} />
                <p className="text-xs font-medium text-text-secondary">{stat.label}</p>
              </div>
              <p className="text-2xl font-extrabold leading-none" style={{ color: stat.color }}>
                {stat.value}
              </p>
            </Card>
          ))}
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
            projects={projects}
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
