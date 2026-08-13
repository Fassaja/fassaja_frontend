import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, List, ListChecks, Trash2, Check, Minus, X, User, Users } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageTour } from '@/components/onboarding/PageTour';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskBoard } from '@/components/tasks/TaskBoard';
import { TaskFilters } from '@/components/tasks/TaskFilters';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { EditTaskModal } from '@/components/tasks/EditTaskModal';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { TaskListSkeleton } from '@/components/common/Skeletons';
import { SlidingHighlight } from '@/components/common/SlidingHighlight';
import { Task, TaskStatus, TaskPriority } from '@/types/task';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useTags } from '@/contexts/TagsContext';
import { useDeferredLoading } from '@/hooks/useDeferredLoading';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  TaskScope,
  filterByScope,
  loadScope,
  saveScope,
  teamProjectIds,
} from '@/utils/taskScope';

const TasksPage: React.FC = () => {
  const { tasks: allTasks, createTask, updateTask, completeTask, deleteTask, loading } = useTasks();
  const { projects } = useProjects();
  const { tags } = useTags();
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
  const [view, setView] = useState<'board' | 'list'>('board');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  // Pré-seleciona o projeto vindo de "Ver tarefas" em Projetos (?project=ID).
  const [filterProject, setFilterProject] = useState<string | 'all'>(
    () => searchParams.get('project') ?? 'all',
  );
  // --- Pessoal x Equipe ---
  // A API devolve as duas coisas juntas; a separação acontece aqui. Tudo abaixo
  // (abas de status, filtros, seleção em massa, quadro e lista) enxerga apenas
  // `tasks` — o recorte do lado escolhido —, então nenhuma outra parte da tela
  // precisa saber que existe essa divisão.
  const [scope, setScope] = useState<TaskScope>(() => loadScope());
  const teamIds = useMemo(() => teamProjectIds(projects), [projects]);
  // O alternador aparece SEMPRE, mesmo sem nenhum projeto de equipe. Escondê-lo
  // nesse caso deixava a separação invisível justamente para quem ainda não
  // sabe que ela existe — e quem abre o lado vazio recebe uma explicação, que
  // é mais útil do que um botão que nunca apareceu.
  const hasTeamSide = teamIds.size > 0;

  const tasks = useMemo(
    () => filterByScope(allTasks, teamIds, scope),
    [allTasks, teamIds, scope],
  );
  const soloCount = useMemo(
    () => filterByScope(allTasks, teamIds, 'solo').length,
    [allTasks, teamIds],
  );
  const teamCount = allTasks.length - soloCount;

  // Filtro por tags (OR: mostra tarefas com qualquer das tags marcadas).
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const toggleTagFilter = (id: string) =>
    setFilterTags(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  // --- Modo de seleção em massa ---
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Pré-filtra por tag (corte transversal). O board/lista aplicam os demais
  // filtros sobre este subconjunto, então não precisam conhecer tags.
  const tasksForView = useMemo(() => {
    if (filterTags.length === 0) return tasks;
    return tasks.filter(task =>
      filterTags.some(id => (task.tags ?? []).some(t => t.id === id)),
    );
  }, [tasks, filterTags]);

  // Tarefas que aparecem na visão atual (mesmos filtros do board/lista).
  // Usado pelo "Selecionar tudo" para mirar exatamente o que está visível.
  const visibleTasks = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return tasksForView.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(term);
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      const matchesProject = filterProject === 'all' || task.projectId === filterProject;
      const matchesStatus = view === 'list' ? filterStatus === 'all' || task.status === filterStatus : true;
      return matchesSearch && matchesPriority && matchesProject && matchesStatus;
    });
  }, [tasksForView, searchTerm, filterPriority, filterProject, filterStatus, view]);

  const visibleSelectedCount = visibleTasks.filter(t => selectedIds.has(t.id)).length;
  const allVisibleSelected = visibleTasks.length > 0 && visibleSelectedCount === visibleTasks.length;
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleTasks.forEach(t => next.delete(t.id));
      else visibleTasks.forEach(t => next.add(t.id));
      return next;
    });
  };

  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  /**
   * Troca o lado e ZERA a seleção em massa.
   *
   * Sem esse reset, itens marcados no lado pessoal continuariam selecionados
   * (e contariam no "Excluir (n)") depois da troca, apagando tarefas que já não
   * estão na tela. É o único caminho aqui que destrói dado sem o usuário ver o
   * que está destruindo.
   */
  const changeScope = (next: TaskScope) => {
    setScope(next);
    saveScope(next);
    exitSelection();
  };

  const confirmBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    try {
      setIsBulkDeleting(true);
      const results = await Promise.allSettled(ids.map(id => deleteTask(id)));
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed === 0) {
        toast.success(ids.length === 1 ? 'Tarefa excluída.' : `${ids.length} tarefas excluídas.`);
      } else {
        toast.error(`Não foi possível excluir ${failed} ${failed === 1 ? 'tarefa' : 'tarefas'}.`);
      }
      setShowBulkDelete(false);
      exitSelection();
    } finally {
      setIsBulkDeleting(false);
    }
  };

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
    setFilterTags([]);
  };

  const statusTabs: { value: TaskStatus | 'all'; label: string; count: number; color: string }[] = [
    { value: 'all', label: 'Todas', count: tasks.length, color: '#2477FF' },
    { value: 'pending', label: 'Pendentes', count: tasks.filter(t => t.status === 'pending').length, color: '#64748B' },
    { value: 'in_progress', label: 'Em andamento', count: tasks.filter(t => t.status === 'in_progress').length, color: '#FBBF24' },
    { value: 'completed', label: 'Concluídas', count: tasks.filter(t => t.status === 'completed').length, color: '#22C55E' },
    { value: 'overdue', label: 'Atrasadas', count: tasks.filter(t => t.status === 'overdue').length, color: '#F43F5E' },
  ];

  const hasActiveFilters =
    searchTerm !== '' || filterPriority !== 'all' || filterProject !== 'all' || filterTags.length > 0;

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

      <ConfirmDialog
        isOpen={showBulkDelete}
        mascotState="investigate"
        tone="danger"
        title={`Excluir ${selectedIds.size} ${selectedIds.size === 1 ? 'tarefa' : 'tarefas'}?`}
        message="As tarefas selecionadas serão removidas."
        hint={
          <>
            <strong className="text-text-primary">Atenção:</strong> esta ação remove todas as
            tarefas selecionadas de uma vez e não pode ser desfeita.
          </>
        }
        confirmLabel={`Excluir ${selectedIds.size} ${selectedIds.size === 1 ? 'tarefa' : 'tarefas'}`}
        cancelLabel="Cancelar"
        onConfirm={confirmBulkDelete}
        onClose={() => !isBulkDeleting && setShowBulkDelete(false)}
      />

      <AppLayout
        onNewTask={openNewTask}
        title={scope === 'team' ? 'Tarefas da equipe' : 'Minhas Tarefas'}
        subtitle={
          scope === 'team'
            ? 'Tarefas dos projetos das equipes de que você participa.'
            : 'Gerencie todas as suas tarefas em um só lugar.'
        }
      >
        <PageTour id="tasks" />
        {loading ? (showSkeleton ? <TaskListSkeleton /> : null) : <>
        {/* Lado Equipe sem nenhum projeto de equipe: explica em vez de mostrar
            um quadro vazio, que parece defeito. */}
        {scope === 'team' && !hasTeamSide && (
          <div className="flex items-start gap-3 mb-4 p-4 rounded-xl border border-border bg-bg-secondary/60">
            <Users size={20} className="text-text-secondary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-text-primary">
                Você ainda não tem tarefas de equipe
              </p>
              <p className="text-sm text-text-secondary mt-0.5">
                Aqui ficam as tarefas dos projetos criados como <strong>equipe</strong>, separadas
                das suas. Crie um projeto de equipe em Projetos para começar.
              </p>
            </div>
          </div>
        )}

        {/* Barra de seleção em massa OU alternador de visão */}
        {selectionMode ? (
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 rounded-xl border border-primary-vibrant/30 bg-primary-light px-3 py-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={toggleSelectAll}
                disabled={visibleTasks.length === 0}
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary-vibrant disabled:opacity-50"
              >
                <span
                  className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-colors ${
                    allVisibleSelected || someVisibleSelected
                      ? 'bg-primary-vibrant border-primary-vibrant text-white'
                      : 'border-primary-vibrant/50'
                  }`}
                >
                  {allVisibleSelected ? (
                    <Check size={13} strokeWidth={3} />
                  ) : someVisibleSelected ? (
                    <Minus size={13} strokeWidth={3} />
                  ) : null}
                </span>
                Selecionar tudo
              </button>
              <span className="text-sm text-text-secondary">
                {selectedIds.size} {selectedIds.size === 1 ? 'selecionada' : 'selecionadas'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBulkDelete(true)}
                disabled={selectedIds.size === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-danger text-white hover:bg-rose-600 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
              >
                <Trash2 size={15} />
                Excluir{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
              </button>
              <button
                type="button"
                onClick={exitSelection}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-surface border border-border text-text-secondary hover:text-text-primary active:scale-95 transition-all"
              >
                <X size={15} /> Concluído
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 mb-4">
            {/* Os três controles desta linha têm altura fixa (h-10 no invólucro,
                h-8 nos botões internos). Sem isso cada um se dimensiona pelo
                próprio conteúdo — o par com badge de contagem cresce e o botão
                solto, sem o p-1 do invólucro, encolhe. */}
            <div className="inline-flex h-10 p-1 rounded-xl bg-bg-secondary border border-border">
              <button
                onClick={() => setView('board')}
                aria-pressed={view === 'board'}
                className={`relative inline-flex h-8 items-center gap-1.5 px-3 rounded-lg text-sm font-semibold transition-colors ${
                  view === 'board' ? 'text-primary-vibrant' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {view === 'board' && <SlidingHighlight groupId="tasks-view" />}
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  <LayoutGrid size={16} /> Quadro
                </span>
              </button>
              <button
                onClick={() => setView('list')}
                aria-pressed={view === 'list'}
                className={`relative inline-flex h-8 items-center gap-1.5 px-3 rounded-lg text-sm font-semibold transition-colors ${
                  view === 'list' ? 'text-primary-vibrant' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {view === 'list' && <SlidingHighlight groupId="tasks-view" />}
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  <List size={16} /> Lista
                </span>
              </button>
            </div>

            {/* Pessoal x Equipe. Fica à direita, junto de "Selecionar", e não
                numa linha própria: são todos controles do que a página mostra.
                Em telas estreitas o rótulo some e ficam ícone + contagem, como
                já acontece com o "Selecionar". */}
            <div className="flex items-center gap-2 ml-auto">
              <div className="inline-flex h-10 p-1 rounded-xl bg-bg-secondary border border-border">
                {([
                  { value: 'solo' as const, label: 'Minhas', icon: User, count: soloCount },
                  { value: 'team' as const, label: 'Equipe', icon: Users, count: teamCount },
                ]).map(opt => {
                  const Icon = opt.icon;
                  const active = scope === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => changeScope(opt.value)}
                      aria-pressed={active}
                      title={opt.label}
                      className={`inline-flex h-8 items-center gap-1.5 px-2.5 sm:px-3 rounded-lg text-sm font-semibold transition-all ${
                        active
                          ? 'bg-surface text-primary-vibrant shadow-sm'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <Icon size={16} />
                      <span className="hidden sm:inline">{opt.label}</span>
                      {/* leading-none: sem isso a altura de linha do badge
                          empurraria o botão para além do h-8. */}
                      <span
                        className={`min-w-[20px] text-center text-xs font-bold leading-none px-1.5 py-1 rounded-full ${
                          active
                            ? 'bg-primary-light text-primary-vibrant'
                            : 'bg-surface text-text-secondary'
                        }`}
                      >
                        {opt.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            {tasks.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectionMode(true)}
                className="inline-flex h-10 items-center gap-1.5 px-3 rounded-xl text-sm font-semibold bg-surface border border-border text-text-secondary hover:text-text-primary hover:border-primary-vibrant/40 active:scale-95 transition-all"
              >
                <ListChecks size={16} />
                <span className="hidden sm:inline">Selecionar</span>
              </button>
            )}
            </div>
          </div>
        )}

        {/* Status tabs (contagem + filtro) — só na visão Lista */}
        {view === 'list' && (
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
                    : 'bg-surface border-border text-text-secondary hover:bg-bg-secondary'
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
        )}

        {/* Filters */}
        <TaskFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filterPriority={filterPriority}
          onPriorityChange={setFilterPriority}
          filterProject={filterProject}
          onProjectChange={setFilterProject}
          projects={projects}
          tags={tags}
          filterTags={filterTags}
          onToggleTag={toggleTagFilter}
          hasActiveFilters={hasActiveFilters}
          onReset={handleResetFilters}
        />

        {/* Tarefas: Quadro (por status) ou Lista (por data) */}
        <div className="mt-6">
          {view === 'board' ? (
            <TaskBoard
              tasks={tasksForView}
              projects={projects}
              searchTerm={searchTerm}
              filterPriority={filterPriority}
              filterProject={filterProject}
              onComplete={completeTask}
              onDelete={taskId => {
                const task = tasks.find(t => t.id === taskId);
                if (task) setDeletingTask(task);
              }}
              onEdit={handleOpenTask}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          ) : (
            <TaskList
              tasks={tasksForView}
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
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          )}
        </div>
        </>}
      </AppLayout>
    </>
  );
};

export default TasksPage;
