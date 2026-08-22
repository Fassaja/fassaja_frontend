/**
 * O que dá para pedir à IA, escrito como se pede.
 *
 * Existe porque a capacidade estava pronta e invisível: o campo de comando
 * aceita texto livre, e texto livre não ensina nada — quem nunca viu não
 * imagina que "crie 10 cards para o dia 27" funciona, então digita algo vago
 * ou nem tenta. Um exemplo clicável mostra o alcance sem precisar de manual.
 *
 * Escolhidos para cobrir eixos DIFERENTES (quantidade, prazo, recorte,
 * tamanho, prioridade) em vez de cinco variações do mesmo pedido: a lista
 * serve para revelar o que a IA entende, não para dar cinco atalhos.
 */
export const EXEMPLOS_DE_COMANDO: string[] = [
  'Crie 10 cards para o dia 27',
  'Estruture um projeto com as etapas deste documento',
  'Liste só as pendências, com prazo para esta sexta',
  'Quebre em tarefas de no máximo um dia cada',
  'Marque como alta prioridade o que trava as outras',
];
