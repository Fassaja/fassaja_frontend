import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, List, ListChecks, Trash2, Check, Minus, X, User, Users, FolderOpen } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageTour } from '@/components/onboarding/PageTour';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskBoard } from '@/components/tasks/TaskBoard';
import { TaskSearch, TaskFilterMenu, ActiveFilterChips } from '@/components/tasks/TaskFilters';
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
  escopoDoProjeto,
  filterByScope,
  isTeamTask,
  loadScope,
  saveScope,
  teamProjectIds,
} from '@/utils/taskScope';
import { whyHidden } from '@/utils/taskVisibility';
import { tint, chipText } from '@/utils/color';
import {
  combinaComProjeto,
  projetoParaEscopo,
  SEM_PROJETO,
  TODOS_PROJETOS,
} from '@/utils/taskFilters';
import { WorkspaceBar } from '@/components/tasks/WorkspaceBar';
import { FiltrosDaArea } from '@/services/workspacesService';
import { useWorkspaces } from '@/hooks/useWorkspaces';

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
  /**
   * A tarefa aberta é guardada por ID, e não como objeto.
   *
   * Guardar o objeto congelava um RETRATO do momento da abertura: adicionar um
   * passo atualizava a lista no contexto, mas o modal seguia mostrando a cópia
   * antiga — o passo só aparecia ao fechar e abrir de novo. Derivando da lista
   * viva, qualquer mudança na tarefa chega ao modal sozinha.
   */
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>();
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
  /**
   * Começa em "Sem projeto" — as tarefas avulsas, que são a caixa de entrada
   * de quem anota primeiro e organiza depois. O que já foi para um projeto tem
   * a tela de Projetos.
   *
   * O `?project=ID` vindo de "Ver tarefas" continua vencendo: quem chegou
   * pedindo um projeto específico quer aquele, não o padrão.
   */
  const [filterProject, setFilterProject] = useState<string>(() => {
    const pedido = searchParams.get('project');
    if (pedido) return pedido;
    // Chegando pelo lado Equipe, "Sem projeto" esconderia TUDO: tarefa de
    // equipe sempre pertence a um projeto. Ver `projetoParaEscopo`.
    const escopoPedido = searchParams.get('scope');
    return projetoParaEscopo(SEM_PROJETO, escopoPedido === 'team' ? 'team' : 'solo');
  });
  // --- Pessoal x Equipe ---
  // A API devolve as duas coisas juntas; a separação acontece aqui. Tudo abaixo
  // (abas de status, filtros, seleção em massa, quadro e lista) enxerga apenas
  // `tasks` — o recorte do lado escolhido —, então nenhuma outra parte da tela
  // precisa saber que existe essa divisão.
  // `?scope=team` vence o localStorage já na primeira renderização: quem veio
  // da área de Equipe pedindo as tarefas do time não pode cair no lado
  // Pessoal. Diferente do `?project=`, aqui não é preciso esperar nada
  // carregar — o lado veio dito no link.
  const [scope, setScope] = useState<TaskScope>(() => {
    const pedido = searchParams.get('scope');
    if (pedido === 'team' || pedido === 'solo') return pedido;
    return loadScope();
  });
  const teamIds = useMemo(() => teamProjectIds(projects), [projects]);
  // O alternador aparece SEMPRE, mesmo sem nenhum projeto de equipe. Escondê-lo
  // nesse caso deixava a separação invisível justamente para quem ainda não
  // sabe que ela existe — e quem abre o lado vazio recebe uma explicação, que
  // é mais útil do que um botão que nunca apareceu.
  const hasTeamSide = teamIds.size > 0;

  /**
   * Chegou por "Ver tarefas" de um projeto: abre o lado onde aquele projeto
   * vive, em vez do lado que ficou salvo da última visita.
   *
   * É a mesma regra que já vale ao criar uma tarefa: se o que a pessoa pediu
   * não caberia na lista, a lista é que se ajusta. Vale nos dois sentidos —
   * projeto de equipe com "Pessoal" salvo, e projeto solo com "Equipe" salvo.
   *
   * O efeito espera os projetos chegarem (antes disso não dá para saber o tipo
   * do projeto) e roda UMA vez por link: sem a trava, trocar de lado no botão
   * seria desfeito no próximo render, e o alternador ficaria preso.
   */
  // Um link com escopo explícito passa a valer como o lado em que a pessoa
  // está trabalhando, igual ao que já acontece quando o alternador é clicado.
  const escopoDaUrlSalvo = useRef(false);
  useEffect(() => {
    // Só na chegada: depois disso quem manda é o alternador.
    if (escopoDaUrlSalvo.current) return;
    escopoDaUrlSalvo.current = true;
    const pedido = searchParams.get('scope');
    if (pedido === 'team' || pedido === 'solo') saveScope(pedido);
  }, [searchParams]);

  /**
   * `?task=ID` abre a tarefa direto, para a busca rápida (⌘K / Ctrl+K) aterrissar NELA em vez
   * de largar a pessoa na lista para procurar de novo.
   *
   * Espera as tarefas carregarem e roda uma vez: sem a trava, fechar o modal
   * o reabriria no render seguinte, e não haveria como sair dele.
   */
  const tarefaDaUrl = searchParams.get('task');
  const tarefaJaAberta = useRef(false);
  useEffect(() => {
    if (!tarefaDaUrl || tarefaJaAberta.current) return;
    if (!allTasks.some(t => t.id === tarefaDaUrl)) return; // ainda carregando
    tarefaJaAberta.current = true;
    setSelectedTaskId(tarefaDaUrl);
    setShowDetailModal(true);
  }, [tarefaDaUrl, allTasks]);

  const projetoDaUrl = searchParams.get('project');
  const escopoJaAplicado = useRef(false);
  useEffect(() => {
    if (!projetoDaUrl || escopoJaAplicado.current) return;
    const alvo = escopoDoProjeto(projects, projetoDaUrl);
    if (!alvo) return; // projetos ainda carregando, ou sem acesso a este
    escopoJaAplicado.current = true;
    if (alvo === scope) return;
    setScope(alvo);
    saveScope(alvo);
  }, [projetoDaUrl, projects, scope]);

  const tasks = useMemo(
    () => filterByScope(allTasks, teamIds, scope),
    [allTasks, teamIds, scope],
  );
  const soloCount = useMemo(
    () => filterByScope(allTasks, teamIds, 'solo').length,
    [allTasks, teamIds],
  );
  const teamCount = allTasks.length - soloCount;

  // `allTasks` e não `tasks`: o recorte Pessoal x Equipe pode mudar embaixo de
  // um modal aberto, e a tarefa não pode sumir da tela por causa disso.
  const selectedTask = useMemo(
    () => allTasks.find(t => t.id === selectedTaskId),
    [allTasks, selectedTaskId],
  );

  // Filtro por tags (OR: mostra tarefas com qualquer das tags marcadas).
  const [filterTags, setFilterTags] = useState<string[]>([]);

  // --- Áreas de trabalho ---
  // O recorte da tela AGORA, no formato que a área guarda. A busca fica de
  // fora de propósito: buscar é gesto do momento, não característica da área.
  const filtrosAtuais = useMemo(
    () => ({
      filterStatus,
      filterPriority,
      filterProject,
      filterTags,
      view,
      scope,
    }),
    [filterStatus, filterPriority, filterProject, filterTags, view, scope],
  );

  /** Aplica um recorte na tela inteira, de uma vez. */
  const aplicarFiltros = useCallback(
    (f: FiltrosDaArea) => {
      const lado: TaskScope = f.scope === 'team' ? 'team' : 'solo';
      setFilterStatus(f.filterStatus as TaskStatus | 'all');
      setFilterPriority(f.filterPriority as TaskPriority | 'all');
      // Áreas salvas ANTES da correção podem carregar o par impossível
      // (Equipe + "Sem projeto"), que abriria a área vazia. Ver
      // `projetoParaEscopo`.
      setFilterProject(projetoParaEscopo(f.filterProject, lado));
      setFilterTags(f.filterTags);
      setView(f.view === 'list' ? 'list' : 'board');
      // `saveScope` junto do `setScope`: o lado Pessoal x Equipe também vive no
      // localStorage, e sem gravar aqui as duas fontes divergiriam — a tela
      // mostrando o lado da área e o navegador lembrando o anterior na próxima
      // visita.
      setScope(lado);
      saveScope(lado);
      // A busca NÃO é restaurada, mas é LIMPA: deixar um termo antigo em cima
      // de um recorte novo esconderia tarefas sem explicação aparente.
      setSearchTerm('');
    },
    [],
  );

  /**
   * O recorte pedido no link, se houve um.
   *
   * `useMemo` porque este objeto é dependência do efeito que reabre a área:
   * criado a cada render, o efeito rodaria sem parar.
   *
   * O lado só entra quando dá para saber qual é — projetos ainda carregando
   * devolvem `null`, e aí a busca pela área ignora o lado em vez de chutar um.
   */
  const escopoDaUrl = searchParams.get('scope');
  const pedidoDoLink = useMemo(() => {
    if (projetoDaUrl) {
      return {
        filterProject: projetoDaUrl,
        scope: escopoDoProjeto(projects, projetoDaUrl),
      };
    }
    if (escopoDaUrl === 'team' || escopoDaUrl === 'solo') {
      return { filterProject: TODOS_PROJETOS, scope: escopoDaUrl as TaskScope };
    }
    return null;
  }, [projetoDaUrl, escopoDaUrl, projects]);

  const areas = useWorkspaces({ filtrosAtuais, aplicarFiltros, projects, tags, pedidoDoLink });

  /**
   * Cria a tarefa e GARANTE que ela apareça.
   *
   * Sem isto a tela mentia: a pessoa via "criada com sucesso" e nada na lista.
   * O escopo (Pessoal × Equipe) fica salvo no localStorage, então quem uma vez
   * abriu o lado "Equipe" continua nele em toda visita — e uma tarefa nova sem
   * projeto é PESSOAL, ou seja, nasce do lado que não está aberto. Busca,
   * status, prioridade, projeto e tag escondem do mesmo jeito.
   *
   * A regra aqui é simples: se o que a pessoa acabou de criar não caberia na
   * lista, a lista é que se ajusta — nunca o contrário.
   */
  const handleCreateTask = async (data: Parameters<typeof createTask>[0]) => {
    const nova = await createTask(data);

    const bloqueio = whyHidden(nova, {
      scope,
      taskScope: isTeamTask(nova, teamIds) ? 'team' : 'solo',
      searchTerm,
      filterStatus,
      filterPriority,
      filterProject,
      filterTags,
    });
    if (!bloqueio) return nova;

    if (bloqueio.scope) {
      setScope(bloqueio.scope);
      saveScope(bloqueio.scope);
    }
    if (bloqueio.filters) {
      setSearchTerm('');
      setFilterStatus('all');
      setFilterPriority('all');
      setFilterProject(TODOS_PROJETOS);
      setFilterTags([]);
    }

    toast.info(
      bloqueio.scope && bloqueio.filters
        ? 'Tarefa criada. Mudamos de lado e limpamos os filtros para mostrá-la.'
        : bloqueio.scope
        ? `Tarefa criada em ${bloqueio.scope === 'team' ? 'Equipe' : 'Pessoal'}. Levamos você até ela.`
        : 'Tarefa criada. Limpamos os filtros para mostrá-la.',
    );
    return nova;
  };
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
      const matchesProject = combinaComProjeto(task, filterProject);
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
    // O filtro de projeto acompanha o lado: "Sem projeto" no lado Equipe
    // deixaria a lista vazia por construção, e a pessoa veria um time sem
    // tarefa nenhuma. Ver `projetoParaEscopo`.
    setFilterProject(atual => projetoParaEscopo(atual, next));
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
    setSelectedTaskId(task.id);
    setShowDetailModal(true);
  };

  const handleEditTask = (task: Task) => {
    setShowDetailModal(false);
    setSelectedTaskId(task.id);
    setShowEditModal(true);
  };

  /**
   * Limpa SÓ o que mora dentro do painel de filtros.
   *
   * A busca e as abas de status ficam fora dele, cada uma com o próprio
   * comando à vista — a busca tem o X no campo, as abas voltam em "Todas".
   * Zerar os três juntos daqui apagava controles que a pessoa não pediu para
   * mexer, e o contraste com o badge do botão (que conta projeto, prioridade e
   * tags) deixava a ação mentindo sobre o próprio alcance: contagem 1, três
   * coisas apagadas.
   */
  const limparFiltrosDoPainel = () => {
    setFilterPriority('all');
    setFilterProject(TODOS_PROJETOS);
    setFilterTags([]);
  };

  const statusTabs: { value: TaskStatus | 'all'; label: string; count: number; color: string }[] = [
    { value: 'all', label: 'Todas', count: tasks.length, color: '#2477FF' },
    { value: 'pending', label: 'Pendentes', count: tasks.filter(t => t.status === 'pending').length, color: '#64748B' },
    { value: 'in_progress', label: 'Em andamento', count: tasks.filter(t => t.status === 'in_progress').length, color: '#FBBF24' },
    { value: 'completed', label: 'Concluídas', count: tasks.filter(t => t.status === 'completed').length, color: '#22C55E' },
    { value: 'overdue', label: 'Atrasadas', count: tasks.filter(t => t.status === 'overdue').length, color: '#F43F5E' },
  ];

  // Só os filtros que moram no painel — a busca não entra na conta porque o
  // termo já fica visível dentro do próprio campo.
  const activeFilterCount =
    (filterPriority !== 'all' ? 1 : 0) +
    (filterProject !== TODOS_PROJETOS ? 1 : 0) +
    filterTags.length;

  /**
   * Busca + filtros, um par só.
   *
   * Extraído porque precisa existir NOS DOIS modos: o "Selecionar tudo" mira
   * exatamente as tarefas visíveis, então filtrar antes de marcar em massa é o
   * caminho natural para "excluir todas as concluídas do projeto X". Deixar
   * isso apenas no modo normal tirava a única forma de mirar a seleção.
   */
  const buscaEFiltros = (
    <>
      {/* Em tela estreita a busca ocupa uma linha inteira (basis-full): espremida
          ao lado dos botões não sobrava largura nem para uma palavra. */}
      <div className="order-last basis-full sm:order-none sm:basis-auto sm:flex-1">
        <TaskSearch value={searchTerm} onChange={setSearchTerm} />
      </div>
      <TaskFilterMenu
        filterPriority={filterPriority}
        onPriorityChange={setFilterPriority}
        filterProject={filterProject}
        onProjectChange={setFilterProject}
        projects={projects}
        tags={tags}
        filterTags={filterTags}
        onToggleTag={toggleTagFilter}
        activeCount={activeFilterCount}
        onReset={limparFiltrosDoPainel}
      />
    </>
  );

  return (
    <>
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateTask={handleCreateTask}
      />

      <TaskDetailModal
        isOpen={showDetailModal}
        task={selectedTask}
        project={projects.find(p => p.id === selectedTask?.projectId)}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedTaskId(undefined);
        }}
        onEdit={handleEditTask}
      />

      {/* `&& !!selectedTask`: agora que a tarefa vem da lista viva, ela pode
          sumir com o modal aberto (exclusão em massa, faxina das concluídas).
          O de detalhe já se protege sozinho; este renderizaria um formulário
          vazio. */}
      <EditTaskModal
        isOpen={showEditModal && !!selectedTask}
        task={selectedTask}
        onClose={() => {
          setShowEditModal(false);
          setSelectedTaskId(undefined);
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

        {/* Áreas de trabalho: acima de tudo, porque trocar de área troca TODO o
            resto — filtros, visão e lado. Deixá-la abaixo faria parecer que ela
            é mais um filtro entre os outros. */}
        {!selectionMode && (
          <WorkspaceBar
            areas={areas.lista}
            ativaId={areas.ativaId}
            alterada={areas.alterada}
            onSelecionar={areas.selecionar}
            onCriar={areas.criar}
            onRenomear={areas.renomear}
            onSalvarFiltros={areas.salvarFiltros}
            onDescartar={areas.descartar}
            onExcluir={areas.excluir}
            limite={areas.limite}
          />
        )}

        {/* Barra de seleção em massa OU alternador de visão */}
        {selectionMode ? (
          <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2 rounded-xl border border-primary-vibrant/30 bg-primary-light px-3 py-2.5">
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
          <div className="flex flex-wrap items-center gap-2 mb-3">{buscaEFiltros}</div>
          </>
        ) : (
          /* Uma barra só: visão, busca, lado e filtros. Antes eram três faixas
             empilhadas (controles, abas de status e um Card de filtros) — uns
             220px de cromo antes da primeira tarefa aparecer. Em tela estreita
             a busca quebra para a linha de baixo sozinha (basis-full), porque
             espremida ao lado dos botões ela não cabia nem para uma palavra.
             Todo controle tem h-10: sem isso cada um se dimensiona pelo próprio
             conteúdo e o par com badge de contagem cresce mais que os outros. */
          <div className="flex flex-wrap items-center gap-2 mb-3">
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

            {buscaEFiltros}

            {/* Pessoal x Equipe. Fica junto de "Selecionar", e não numa linha
                própria: são todos controles do que a página mostra. Em telas
                estreitas o rótulo some e ficam ícone + contagem.

                `sm:ml-auto`, e não `ml-auto`: empurrar para a direita só faz
                sentido enquanto tudo cabe na MESMA linha. No celular a barra
                quebra, e o `ml-auto` jogava este grupo sozinho contra a borda
                direita enquanto Quadro/Lista ficava na esquerda — as linhas
                pareciam desalinhadas de propósito. Sem ele, tudo se alinha à
                esquerda, como o resto da página. */}
            <div className="flex items-center gap-2 sm:ml-auto">
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

        <ActiveFilterChips
          filterPriority={filterPriority}
          onPriorityChange={setFilterPriority}
          filterProject={filterProject}
          onProjectChange={setFilterProject}
          projects={projects}
          tags={tags}
          filterTags={filterTags}
          onToggleTag={toggleTagFilter}
        />

        {/* Status tabs (contagem + filtro) — só na visão Lista */}
        {view === 'list' && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
          {statusTabs.map(tab => {
            const active = filterStatus === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setFilterStatus(tab.value)}
                /* Ativo tinge o fundo com a cor do status em vez de preenchê-lo
                   sólido: cinco chips saturados lado a lado gritavam mais que
                   as próprias tarefas, e o filtro é cromo. A cor não fica só no
                   fundo — o ponto e o texto também a carregam, então dá para
                   ver qual está ativo mesmo com o contraste baixo. */
                className={`shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-semibold transition-all active:scale-[0.97] ${
                  active
                    ? 'border-transparent'
                    : 'bg-surface border-border text-text-secondary hover:bg-bg-secondary'
                }`}
                style={
                  active
                    ? { backgroundColor: tint(tab.color, 'medium'), color: chipText(tab.color) }
                    : undefined
                }
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: active ? tab.color : 'currentColor' }}
                />
                {tab.label}
                <span
                  className={`min-w-[20px] text-center text-xs font-bold ${
                    active ? '' : 'text-text-soft'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
        )}

        {/* Explica o padrão em vez de deixar a tela vazia sem motivo aparente.
            Quem organiza tudo em projetos chegaria aqui e veria nada — e o
            estado vazio genérico ("ajuste seus filtros") não diz QUAL filtro
            está agindo nem que ele veio ligado de fábrica. */}
        {visibleTasks.length === 0 && filterProject === SEM_PROJETO && tasks.length > 0 && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-border bg-bg-secondary/60 p-4">
            <FolderOpen size={20} className="mt-0.5 shrink-0 text-text-secondary" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">
                Você está vendo só as tarefas sem projeto
              </p>
              <p className="mt-0.5 text-sm text-text-secondary">
                {tasks.length === 1
                  ? 'Há 1 tarefa em projetos, escondida por este filtro.'
                  : `Há ${tasks.length} tarefas em projetos, escondidas por este filtro.`}{' '}
                <button
                  type="button"
                  onClick={() => setFilterProject(TODOS_PROJETOS)}
                  className="font-semibold text-primary-vibrant underline underline-offset-2"
                >
                  Ver todas
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Tarefas: Quadro (por status) ou Lista (por data) */}
        <div className="mt-4">
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
