/**
 * Os passos mostrados enquanto a IA monta o rascunho.
 *
 * A espera não pode ser um vazio: quem lê "montando os cards" entende o que
 * vem a seguir e por que demora. Também ensina o modelo mental da ferramenta —
 * ela LÊ, depois RECORTA, depois PROPÕE, e nada é criado antes de aprovar.
 */
export const PASSOS_DA_GERACAO = [
  'Lendo o documento',
  'Encontrando as etapas do trabalho',
  'Montando os cards e os prazos',
];

/**
 * Quanto cada passo fica em destaque.
 *
 * A API responde de uma vez só, sem avisar em que ponto está — então o avanço
 * é ILUSTRATIVO, e de propósito: o último passo nunca se marca como concluído
 * sozinho, fica girando até a resposta chegar. A tela não afirma um progresso
 * que ninguém mediu.
 */
export const MS_POR_PASSO = 2500;

/**
 * O passo seguinte, sem nunca sair da lista.
 *
 * A trava no último é o ponto todo: sem ela o contador continuaria subindo
 * enquanto a resposta demorasse, o índice passaria do fim do array e a tela
 * ficaria em branco justo durante a espera — que é quando a pessoa mais
 * precisa ver alguma coisa acontecendo.
 */
export function proximoPasso(atual: number, total: number): number {
  // O `max(0, …)` cobre uma lista vazia, em que `total - 1` seria -1.
  return Math.max(0, Math.min(atual + 1, total - 1));
}
