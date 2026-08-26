/**
 * Valores especiais do filtro de projeto.
 *
 * `TODOS` não filtra nada. `SEM_PROJETO` é o avulso — a caixa de entrada de
 * quem anota primeiro e organiza depois, e por isso o padrão ao abrir a tela.
 *
 * São strings e não um enum porque o valor viaja pela URL (`?project=`) e é
 * guardado nas áreas de trabalho; texto simples atravessa os dois sem tradução.
 */
export const TODOS_PROJETOS = 'all';
export const SEM_PROJETO = 'none';

/**
 * A tarefa passa pelo filtro de projeto?
 *
 * Existe num lugar só porque a mesma regra era repetida em quatro arquivos —
 * a lista, o quadro, a página e o `whyHidden`. Quatro cópias de uma condição
 * é como uma delas fica para trás quando surge um caso novo (foi exatamente o
 * que aconteceu ao introduzir "sem projeto").
 */
export function combinaComProjeto(
  /* Forma mínima, e não `Task`: importar o tipo pelo alias `@/` quebraria os
     testes, que rodam em Node puro e não conhecem o alias do Vite. Tipagem
     estrutural faz toda Task satisfazer isto de qualquer forma. */
  task: { projectId?: string | null },
  filterProject: string,
): boolean {
  if (filterProject === TODOS_PROJETOS) return true;
  // `projectId` ausente e string vazia contam como avulsa: o campo é opcional
  // na API e nem toda origem grava `undefined`.
  if (filterProject === SEM_PROJETO) return !task.projectId;
  return task.projectId === filterProject;
}

/**
 * Ajusta o filtro de projeto ao lado escolhido (Pessoal × Equipe).
 *
 * "Sem projeto" e o lado Equipe se excluem POR CONSTRUÇÃO: tarefa de equipe é
 * definida como a que pertence a um projeto de equipe (ver `isTeamTask`), então
 * o par nunca casa e a lista aparece vazia — com 17 tarefas ali, escondidas.
 *
 * Era o que acontecia ao clicar em "Ver todas as tarefas" na área de Equipe: o
 * link trazia `?scope=team` corretamente, mas o filtro de projeto abria no
 * padrão "Sem projeto" e apagava tudo. O mesmo valia ao trocar de lado no
 * alternador.
 *
 * Só mexe nesse par impossível; qualquer outro filtro é escolha da pessoa e
 * passa intacto.
 */
export function projetoParaEscopo(filterProject: string, scope: 'solo' | 'team'): string {
  if (scope === 'team' && filterProject === SEM_PROJETO) return TODOS_PROJETOS;
  return filterProject;
}
