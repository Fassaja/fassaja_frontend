import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageTour } from '@/components/onboarding/PageTour';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import { EditProjectModal } from '@/components/projects/EditProjectModal';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ProjectsSkeleton } from '@/components/common/Skeletons';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useDeferredLoading } from '@/hooks/useDeferredLoading';
import { useToast } from '@/contexts/ToastContext';
import { Project } from '@/types/project';

const ProjectsPage: React.FC = () => {
  const { projects, createProject, updateProject, deleteProject, loading } = useProjects();
  const showSkeleton = useDeferredLoading(loading);
  const { tasks, deleteTask } = useTasks();
  const toast = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [deletingProject, setDeletingProject] = useState<Project | undefined>();
  const [isDeleting, setIsDeleting] = useState(false);

  const deletingTasks = deletingProject
    ? tasks.filter(t => t.projectId === deletingProject.id)
    : [];

  const confirmDeleteProject = async () => {
    if (!deletingProject) return;
    const taskCount = deletingTasks.length;
    try {
      setIsDeleting(true);
      await Promise.all(deletingTasks.map(t => deleteTask(t.id)));
      await deleteProject(deletingProject.id);
      toast.success(
        taskCount > 0
          ? `Projeto e ${taskCount} ${taskCount === 1 ? 'tarefa excluídos' : 'tarefas excluídos'}.`
          : 'Projeto excluído.',
      );
      setDeletingProject(undefined);
    } catch (err) {
      toast.error(
        (err as { status?: number }).status === 403
          ? 'Apenas o dono do projeto pode excluí-lo.'
          : 'Não foi possível excluir o projeto. Tente novamente.',
      );
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

  const overallCompleted = tasks.filter(t => t.status === 'completed').length;
  const overallPct = tasks.length ? Math.round((overallCompleted / tasks.length) * 100) : 0;

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
        <PageTour id="projects" />
        {loading ? (
          showSkeleton ? <ProjectsSkeleton /> : null
        ) : projects.length > 0 ? (
          <>
            {/* Resumo geral dos projetos */}
            <Card className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
              <div className="flex gap-6 sm:gap-8">
                <div>
                  <p className="text-2xl font-extrabold text-text-primary leading-none">{projects.length}</p>
                  <p className="text-xs text-text-secondary mt-1">Projetos</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-text-primary leading-none">{tasks.length}</p>
                  <p className="text-xs text-text-secondary mt-1">Tarefas</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-success leading-none">{overallCompleted}</p>
                  <p className="text-xs text-text-secondary mt-1">Concluídas</p>
                </div>
              </div>
              <div className="flex-1 sm:max-w-xs sm:ml-auto">
                <div className="flex justify-between text-xs font-semibold text-text-secondary mb-1">
                  <span>Progresso geral</span>
                  <span>{overallPct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-vibrant to-turquoise transition-all"
                    style={{ width: `${overallPct}%` }}
                  />
                </div>
              </div>
            </Card>

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
          </>
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
