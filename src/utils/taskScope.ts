// `import type` (e não import normal) porque o teste roda em Node puro, sem o
// resolvedor de alias do Vite: tipo é apagado na compilação, valor não seria.
import type { Task } from '@/types/task';
import type { Project } from '@/types/project';

/**
 * Separação entre o trabalho pessoal e o da equipe em Minhas Tarefas.
 *
 * A API devolve tudo numa lista só (tarefas suas, atribuídas a você e as dos
 * projetos das equipes de que você participa), o que faz a demanda do time
 * aparecer misturada com a lista pessoal. A separação é feita aqui, no cliente,
 * usando o `type` do projeto que a tarefa já referencia — nenhuma chamada nova
 * e nenhum campo novo no banco.
 */
export type TaskScope = 'solo' | 'team';

export const TASK_SCOPE_KEY = 'fassaja_task_scope';

/** IDs dos projetos de equipe — o que define o lado "Equipe". */
export function teamProjectIds(projects: Project[]): Set<string> {
  return new Set(projects.filter(p => p.type === 'team').map(p => p.id));
}

/**
 * Tarefa de equipe é a que pertence a um projeto de equipe. Tudo o mais é
 * pessoal: sem projeto, projeto solo, ou projeto de equipe que você não
 * enxerga mais (saiu do time) — nesse último caso ela volta para o lado
 * pessoal em vez de sumir da tela, que é o pior desfecho possível.
 */
export function isTeamTask(task: Task, teamIds: Set<string>): boolean {
  return !!task.projectId && teamIds.has(task.projectId);
}

export function filterByScope(
  tasks: Task[],
  teamIds: Set<string>,
  scope: TaskScope,
): Task[] {
  return tasks.filter(task =>
    scope === 'team' ? isTeamTask(task, teamIds) : !isTeamTask(task, teamIds),
  );
}

/**
 * De que lado vive um projeto.
 *
 * Existe para quem chega em Minhas Tarefas por "Ver tarefas" de um projeto: o
 * lado (Pessoal x Equipe) fica salvo no localStorage, então clicar num projeto
 * de equipe com "Pessoal" guardado filtrava o projeto certo dentro do lado
 * errado — e a lista vinha vazia, sem dizer por quê.
 *
 * Devolve `null` quando o projeto não está na lista: ou os projetos ainda
 * estão carregando, ou a pessoa não tem acesso. Nos dois casos não dá para
 * decidir, e trocar de lado no chute seria pior do que não mexer.
 */
export function escopoDoProjeto(projects: Project[], projectId: string): TaskScope | null {
  const projeto = projects.find(p => p.id === projectId);
  if (!projeto) return null;
  return projeto.type === 'team' ? 'team' : 'solo';
}

export function loadScope(): TaskScope {
  try {
    return localStorage.getItem(TASK_SCOPE_KEY) === 'team' ? 'team' : 'solo';
  } catch {
    return 'solo';
  }
}

export function saveScope(scope: TaskScope): void {
  try {
    localStorage.setItem(TASK_SCOPE_KEY, scope);
  } catch {
    // localStorage indisponível: a escolha vale só para esta sessão.
  }
}
