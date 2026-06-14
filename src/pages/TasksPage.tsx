import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskFilters } from '@/components/tasks/TaskFilters';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { EditTaskModal } from '@/components/tasks/EditTaskModal';
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

  const statusTabs: { value: TaskStatus | 'all'; label: string; count: number; color: string }[] = [
    { value: 'all', label: 'Todas', count: tasks.length, color: '#2477FF' },
    { value: 'pending', label: 'Pendentes', count: tasks.filter(t => t.status === 'pending').length, color: '#64748B' },
    { value: 'in_progress', label: 'Em andamento', count: tasks.filter(t => t.status === 'in_progress').length, color: '#FBBF24' },
    { value: 'completed', label: 'Concluídas', count: tasks.filter(t => t.status === 'completed').length, color: '#22C55E' },
    { value: 'overdue', label: 'Atrasadas', count: tasks.filter(t => t.status === 'overdue').length, color: '#F43F5E' },
  ];

  const hasActiveFilters =
    searchTerm !== '' || filterPriority !== 'all' || filterProject !== 'all';

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
        {/* Status tabs (contagem + filtro) */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
          {statusTabs.map(tab => {
            const active = filterStatus === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setFilterStatus(tab.value)}
                className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-semibold transition-all active:scale-[0.97] ${
                  active
                    ? 'border-transparent text-white shadow-sm'
                    : 'bg-white border-border text-text-secondary hover:bg-bg-secondary'
                }`}
                style={active ? { backgroundColor: tab.color } : undefined}
              >
                {tab.label}
                <span
                  className={`min-w-[20px] text-center text-xs font-bold px-1.5 py-0.5 rounded-full ${
                    active ? 'bg-white/25 text-white' : 'bg-bg-secondary text-text-secondary'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <TaskFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filterPriority={filterPriority}
          onPriorityChange={setFilterPriority}
          filterProject={filterProject}
          onProjectChange={setFilterProject}
          projects={projects}
          hasActiveFilters={hasActiveFilters}
          onReset={handleResetFilters}
        />

        {/* Task List */}
        <div className="mt-6">
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
