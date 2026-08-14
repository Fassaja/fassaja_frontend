import type { Task } from '@/types/task';
import type { TaskScope } from './taskScope.ts';

/**
 * Por que uma tarefa recém-criada não apareceria na lista.
 *
 * Existe por um bug real: a pessoa criava a tarefa, recebia "criada com
 * sucesso" e não via nada. O escopo (Pessoal × Equipe) fica salvo no
 * localStorage, então quem uma vez trocou para "Equipe" continua lá em toda
 * visita — e uma tarefa nova sem projeto é PESSOAL, ou seja, cai fora do lado
 * que está aberto. Os demais filtros (busca, status, prioridade, projeto, tag)
 * escondem do mesmo jeito, só que duram apenas a sessão.
 *
 * Em vez de deixar a tela mentir, quem chama usa este diagnóstico para trazer
 * a lista até a tarefa.
 */

export interface ActiveFilters {
  scope: TaskScope;
  /** Escopo ao qual a tarefa criada pertence. */
  taskScope: TaskScope;
  searchTerm: string;
  filterStatus: string;
  filterPriority: string;
  filterProject: string;
  filterTags: string[];
}

export interface VisibilityBlock {
  /** Escopo precisa mudar para este valor. */
  scope?: TaskScope;
  /** Há filtros de sessão escondendo a tarefa. */
  filters: boolean;
}

/**
 * O que impede a tarefa de aparecer, ou `null` se ela já apareceria.
 *
 * Não recebe a tarefa inteira: só o escopo dela e os filtros ativos. Isso
 * mantém a função pura e independente de como a página guarda o estado.
 */
export function whyHidden(task: Task, f: ActiveFilters): VisibilityBlock | null {
  const escopoErrado = f.taskScope !== f.scope;

  const buscaEsconde =
    f.searchTerm.trim().length > 0 &&
    !task.title.toLowerCase().includes(f.searchTerm.trim().toLowerCase());
  const statusEsconde = f.filterStatus !== 'all' && task.status !== f.filterStatus;
  const prioridadeEsconde = f.filterPriority !== 'all' && task.priority !== f.filterPriority;
  const projetoEsconde = f.filterProject !== 'all' && task.projectId !== f.filterProject;
  // Tarefa nova nasce sem tag, então QUALQUER tag marcada a esconde.
  const tagEsconde =
    f.filterTags.length > 0 &&
    !f.filterTags.some(id => (task.tags ?? []).some(t => t.id === id));

  const filtros =
    buscaEsconde || statusEsconde || prioridadeEsconde || projetoEsconde || tagEsconde;

  if (!escopoErrado && !filtros) return null;
  return { scope: escopoErrado ? f.taskScope : undefined, filters: filtros };
}
