import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskFilters } from '@/components/tasks/TaskFilters';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { EditTaskModal } from '@/components/tasks/EditTaskModal';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { Task, TaskStatus, TaskPriority } from '@/types/task';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useDeferredLoading } from '@/hooks/useDeferredLoading';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

const TasksPage: React.FC = () => {
  const { tasks, createTask, updateTask, completeTask, deleteTask, loading } = useTasks();
  const { projects } = useProjects();
  const showSkeleton = useDeferredLoading(loading);
  const { isGuest, guestTaskCount, guestTaskLimit, requireAuth } = useAuth();
  const toast = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const openNewTask = () => {
    if (isGuest && guestTaskCount >= guestTaskLimit) {
      requireAuth(`Visitantes podem criar até ${guestTaskLimit} tarefas por dia. Entre para criar mais.`);
      return;
    }
    setShowCreateModal(true);
  };
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>();
  const [deletingTask, setDeletingTask] = useState<Task | undefined>();
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDeleteTask = async () => {
    if (!deletingTask) return;
    try {
      setIsDeleting(true);
      await deleteTask(deletingTask.id);
      toast.success('Tarefa excluída.');
      setDeletingTask(undefined);
    } catch {
      toast.error('Não foi possível excluir a tarefa. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  // Pré-seleciona o projeto vindo de "Ver tarefas" em Projetos (?project=ID).
  const [filterProject, setFilterProject] = useState<string | 'all'>(
    () => searchParams.get('project') ?? 'all',
  );

  const handleOpenTask = (task: Task) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  const handleEditTask = (task: Task) => {
    setShowDetailModal(false);
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

      <TaskDetailModal
        isOpen={showDetailModal}
        task={selectedTask}
        project={projects.find(p => p.id === selectedTask?.projectId)}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedTask(undefined);
        }}
        onEdit={handleEditTask}
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

      <ConfirmDialog
        isOpen={!!deletingTask}
        mascotState="investigate"
        tone="danger"
        title="Excluir esta tarefa?"
        message={deletingTask ? `"${deletingTask.title}"` : ''}
        hint={
          <>
            <strong className="text-text-primary">Atenção:</strong> esta tarefa será removida
            permanentemente. Esta ação não pode ser desfeita.
          </>
        }
        confirmLabel="Excluir tarefa"
        cancelLabel="Cancelar"
        onConfirm={confirmDeleteTask}
        onClose={() => !isDeleting && setDeletingTask(undefined)}
      />

      <AppLayout
        onNewTask={openNewTask}
        title="Minhas Tarefas"
        subtitle="Gerencie todas as suas tarefas em um só lugar."
      >
        {loading ? (showSkeleton ? <LoadingScreen /> : null) : <>
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
            onDelete={taskId => {
              const task = tasks.find(t => t.id === taskId);
              if (task) setDeletingTask(task);
            }}
            onEdit={handleOpenTask}
          />
        </div>
        </>}
      </AppLayout>
    </>
  );
};

export default TasksPage;
