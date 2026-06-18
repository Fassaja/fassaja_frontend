import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import { EditProjectModal } from '@/components/projects/EditProjectModal';
import { EmptyState } from '@/components/common/EmptyState';
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

  const handleDeleteProject = async (project: Project) => {
    const projectTasks = tasks.filter(t => t.projectId === project.id);

    if (projectTasks.length === 0) {
      if (window.confirm(`Deseja deletar o projeto "${project.name}"?`)) {
        await deleteProject(project.id);
      }
      return;
    }

    const message =
      `O projeto "${project.name}" possui ${projectTasks.length} ` +
      `${projectTasks.length === 1 ? 'tarefa' : 'tarefas'}.\n\n` +
      `Clique em OK para excluir o projeto E todas as suas tarefas.\n` +
      `Clique em Cancelar para não excluir nada.`;

    if (window.confirm(message)) {
      await Promise.all(projectTasks.map(t => deleteTask(t.id)));
      await deleteProject(project.id);
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
                  onDelete={() => handleDeleteProject(project)}
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
