/**
 * Qual dos dois vazios da tela de tarefas está acontecendo.
 *
 * O quadro e a lista mostravam o mesmo texto ("Ajuste seus filtros ou crie uma
 * nova tarefa") nas duas situações. Elas não têm o mesmo remédio:
 *
 *  - PRIMEIRO USO: não existe tarefa nenhuma. Não há filtro agindo, e mandar
 *    ajustar filtros manda procurar um problema que não existe.
 *  - RECORTE: as tarefas existem e a busca ou os filtros escondem todas. Aqui
 *    o número de escondidas é a informação que falta — é ele que diferencia
 *    "não achei" de "não tem".
 *
 * A decisão mora aqui, e não dentro do componente, porque o quadro e a lista a
 * tomam separadamente: duas cópias de uma condição é como uma delas fica para
 * trás. (Foi assim que os dois textos genéricos surgiram.)
 */
export type VazioDeTarefas =
  | { tipo: 'primeiro-uso' }
  | { tipo: 'recorte'; escondidas: number };

export function vazioDeTarefas(total: number): VazioDeTarefas {
  // Defensivo contra um total negativo vindo de uma contagem torta: sem isto,
  // a tela anunciaria "-1 tarefas escondidas".
  if (total <= 0) return { tipo: 'primeiro-uso' };
  return { tipo: 'recorte', escondidas: total };
}

/**
 * A frase do vazio por recorte, com a concordância certa.
 *
 * Fica junto da decisão porque a contagem e o texto são a mesma informação:
 * separá-los é como um deles envelhece sozinho.
 */
export function textoDoRecorte(escondidas: number): string {
  return escondidas === 1
    ? 'Existe 1 tarefa nesta área, escondida pela busca ou pelos filtros atuais.'
    : `Existem ${escondidas} tarefas nesta área, escondidas pela busca ou pelos filtros atuais.`;
}
