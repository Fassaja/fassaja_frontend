import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, ChevronDown } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageTour } from '@/components/onboarding/PageTour';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import { EditProjectModal } from '@/components/projects/EditProjectModal';
import { Card } from '@/components/common/Card';
import { HoverRevealCard } from '@/components/common/HoverRevealCard';
import { CardSummaryContent } from '@/components/common/CardSummaryContent';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ProjectsSkeleton } from '@/components/common/Skeletons';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useDeferredLoading } from '@/hooks/useDeferredLoading';
import { useToast } from '@/contexts/ToastContext';
import { Project } from '@/types/project';
import { projectsService } from '@/services/projectsService';
import { HIDE_COMPLETED_AFTER_DAYS, splitByVisibility } from '@/utils/projectVisibility';
import { projectSummary } from '@/utils/cardSummary';

const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { projects, createProject, updateProject, setProjectCompleted, deleteProject, loading } =
    useProjects();
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

  // Projetos concluídos há mais de HIDE_COMPLETED_AFTER_DAYS saem da grade e
  // ficam atrás de "Concluídos". Continuam existindo — só não ocupam a tela.
  const { visible, hidden } = useMemo(() => splitByVisibility(projects), [projects]);
  const [showArchived, setShowArchived] = useState(false);

  // Total vitalício de concluídos: vem do servidor porque os projetos somem da
  // lista e as tarefas deles são apagadas — não há o que contar aqui.
  const [completedTotal, setCompletedTotal] = useState<number | null>(null);
  const concluidosNaLista = projects.filter(p => p.completedAt).length;
  useEffect(() => {
    let cancelado = false;
    projectsService
      .getStats()
      .then(s => !cancelado && setCompletedTotal(s.completedProjects))
      // Sem o total, o resumo simplesmente não mostra o número — melhor do que
      // exibir um valor errado contando só o que está na tela.
      .catch(() => !cancelado && setCompletedTotal(null));
    return () => {
      cancelado = true;
    };
    // Reconsulta quando um projeto é concluído ou reaberto.
  }, [projects.length, concluidosNaLista]);

  const toggleCompleted = async (project: Project) => {
    const concluindo = !project.completedAt;
    try {
      await setProjectCompleted(project.id, concluindo);
      toast.success(concluindo ? 'Projeto concluído.' : 'Projeto reaberto.');
    } catch (err) {
      toast.error(
        (err as { status?: number }).status === 403
          ? 'Apenas o dono do projeto pode concluí-lo.'
          : 'Não foi possível atualizar o projeto. Tente novamente.',
      );
    }
  };

  /**
   * Um projeto na grade. Existe como função porque a grade aparece duas vezes
   * (ativos e concluídos antigos) — sem isto, o card e sua síntese teriam de
   * ser mantidos em sincronia em dois lugares.
   */
  const renderProject = (project: Project) => {
    const projectTasks = tasks.filter(t => t.projectId === project.id);
    return (
      <HoverRevealCard
        key={project.id}
        summary={<CardSummaryContent summary={projectSummary(projectTasks)} />}
      >
        <ProjectCard
          project={project}
          taskCount={projectTasks.length}
          completedCount={projectTasks.filter(t => t.status === 'completed').length}
          onEdit={() => setEditingProject(project)}
          onDelete={() => setDeletingProject(project)}
          onToggleCompleted={toggleCompleted}
        />
      </HoverRevealCard>
    );
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
        actionLabel="Novo projeto"
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
                {/* Contador vitalício do servidor: não encolhe quando o projeto
                    sai da lista nem quando as tarefas dele são apagadas. */}
                {completedTotal !== null && completedTotal > 0 && (
                  <div>
                    <p className="text-2xl font-extrabold text-primary-vibrant leading-none">
                      {completedTotal}
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      {completedTotal === 1 ? 'Projeto feito' : 'Projetos feitos'}
                    </p>
                  </div>
                )}
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
              {visible.map(renderProject)}
            </div>

            {/* Concluídos há mais de uma semana: saem da grade, mas continuam
                acessíveis. Sumir de vez faria a pessoa achar que perdeu o
                projeto — e reabrir é a saída se ainda houver o que fazer. */}
            {hidden.length > 0 && (
              <div className="mt-8">
                <button
                  type="button"
                  onClick={() => setShowArchived(v => !v)}
                  aria-expanded={showArchived}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-surface text-sm font-semibold text-text-secondary hover:text-text-primary hover:border-primary-vibrant/40 transition-all"
                >
                  <Archive size={16} />
                  {hidden.length} {hidden.length === 1 ? 'projeto concluído' : 'projetos concluídos'}{' '}
                  há mais de {HIDE_COMPLETED_AFTER_DAYS} dias
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${showArchived ? 'rotate-180' : ''}`}
                  />
                </button>

                {showArchived && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                    {hidden.map(renderProject)}
                  </div>
                )}
              </div>
            )}
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
            /* Quem chega aqui com um documento na mão (proposta, ata, escopo)
               não quer criar um projeto vazio e digitar tudo de novo: a IA
               monta o projeto e os cards a partir dele. O caminho existia e só
               era encontrado por quem já sabia que existia. */
            secondaryAction={{
              label: 'Ou monte a partir de um documento, com a IA →',
              onClick: () => navigate('/ai'),
            }}
          />
        )}
      </AppLayout>
    </>
  );
};

export default ProjectsPage;
