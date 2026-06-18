import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import { EditProjectModal } from '@/components/projects/EditProjectModal';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useDeferredLoading } from '@/hooks/useDeferredLoading';
import { Project } from '@/types/project';

const ProjectsPage: React.FC = () => {
  const { projects, createProject, updateProject, deleteProject, loading } = useProjects();
  const showSkeleton = useDeferredLoading(loading);
  const { tasks, deleteTask } = useTasks();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [deletingProject, setDeletingProject] = useState<Project | undefined>();
  const [isDeleting, setIsDeleting] = useState(false);

  const deletingTasks = deletingProject
    ? tasks.filter(t => t.projectId === deletingProject.id)
    : [];

  const confirmDeleteProject = async () => {
    if (!deletingProject) return;
    try {
      setIsDeleting(true);
      await Promise.all(deletingTasks.map(t => deleteTask(t.id)));
      await deleteProject(deletingProject.id);
      setDeletingProject(undefined);
    } finally {
      setIsDeleting(false);
    }
  };

  const getProjectStats = (projectId: string) => {
    const projectTasks = tasks.filter(t => t.projectId === projectId);
    return {
      total: projectTasks.length,
      completed: projectTasks.filter(t => t.status === 'completed').length,
    };
  };

  return (
    <>
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateProject={createProject}
      />

      <EditProjectModal
        isOpen={!!editingProject}
        project={editingProject}
        onClose={() => setEditingProject(undefined)}
        onUpdateProject={updateProject}
      />

      <ConfirmDialog
        isOpen={!!deletingProject}
        mascotState="confused"
        tone="danger"
        title={`Excluir "${deletingProject?.name}"?`}
        message={
          deletingTasks.length > 0
            ? `Este projeto tem ${deletingTasks.length} ${
                deletingTasks.length === 1 ? 'tarefa vinculada' : 'tarefas vinculadas'
              }.`
            : 'Esta ação não pode ser desfeita.'
        }
        hint={
          deletingTasks.length > 0 ? (
            <>
              <strong className="text-text-primary">Atenção:</strong> ao continuar, o projeto e{' '}
              <strong className="text-text-primary">
                todas as {deletingTasks.length === 1 ? 'sua tarefa' : `suas ${deletingTasks.length} tarefas`}
              </strong>{' '}
              serão excluídos. Esta ação não pode ser desfeita.
            </>
          ) : undefined
        }
        confirmLabel={
          deletingTasks.length > 0 ? 'Excluir projeto e tarefas' : 'Excluir projeto'
        }
        cancelLabel="Cancelar"
        onConfirm={confirmDeleteProject}
        onClose={() => !isDeleting && setDeletingProject(undefined)}
      />

      <AppLayout
        onNewTask={() => setShowCreateModal(true)}
        actionLabel="Novo Projeto"
        title="Projetos"
        subtitle="Organize suas tarefas por projetos."
      >
        {loading ? (
          showSkeleton ? <LoadingScreen /> : null
        ) : projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => {
              const stats = getProjectStats(project.id);
              return (
                <ProjectCard
                  key={project.id}
                  project={project}
                  taskCount={stats.total}
                  completedCount={stats.completed}
                  onEdit={() => setEditingProject(project)}
                  onDelete={() => setDeletingProject(project)}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState
            mascotState="confused"
            title="Nenhum projeto ainda"
            description="Crie seu primeiro projeto para começar a organizar suas tarefas"
            action={{
              label: 'Criar Projeto',
              onClick: () => setShowCreateModal(true),
            }}
          />
        )}
      </AppLayout>
    </>
  );
};

export default ProjectsPage;
