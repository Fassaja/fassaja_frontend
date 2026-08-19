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
