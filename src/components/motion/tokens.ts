/**
 * O padrão de movimento do Fassajá: as únicas curvas, durações e molas que o
 * app usa.
 *
 * Antes cada componente escolhia os seus números — eram dez molas diferentes e
 * seis durações espalhadas, e dois menus lado a lado abriam em ritmos
 * distintos. Agora um menu, um modal e uma lista falam a mesma língua, e mudar
 * o ritmo do app inteiro é mudar este arquivo.
 *
 * Como escolher:
 *   transicao.rapida ... o que responde a um clique: menu, dica, tooltip, chip
 *   transicao.media .... o que ocupa a tela: modal, painel, véu
 *   transicao.lenta .... entrada de regiões da página
 *   transicao.progresso  barra ou anel enchendo até o valor
 *   transicao.saida .... qualquer coisa indo embora (sai mais rápido do que entra)
 *   mola.firme ......... o que desliza de um lugar a outro: pílula, reordenação
 *   mola.viva .......... o que aparece com presença: lançador, aviso, diálogo
 *   mola.quique ........ comemoração: marcar como feito, a chama da sequência
 *
 * O CSS do kit (index.css) usa a mesma curva de entrada: `--fx-ease` e o
 * `ease-out-expo` do Tailwind.
 */

// Tupla mutável, não `as const`: o `animate()` do framer recusa a versão
// somente-leitura.
type Bezier = [number, number, number, number];

export const curva = {
  /** Desacelera até parar: começa rápido, chega suave (out-expo). */
  entrada: [0.16, 1, 0.3, 1] as Bezier,
  /** Acelera ao sair: some sem arrastar (ease-in). */
  saida: [0.4, 0, 1, 1] as Bezier,
};

export const duracao = {
  rapida: 0.15,
  media: 0.22,
  lenta: 0.35,
  progresso: 0.9,
} as const;

export const transicao = {
  rapida: { duration: duracao.rapida, ease: curva.entrada },
  media: { duration: duracao.media, ease: curva.entrada },
  lenta: { duration: duracao.lenta, ease: curva.entrada },
  progresso: { duration: duracao.progresso, ease: curva.entrada },
  saida: { duration: duracao.rapida, ease: curva.saida },
} as const;

export const mola = {
  firme: { type: 'spring', stiffness: 400, damping: 32 } as const,
  viva: { type: 'spring', stiffness: 420, damping: 28 } as const,
  quique: { type: 'spring', stiffness: 500, damping: 18 } as const,
};

/** Intervalo entre irmãos numa entrada em cascata, em segundos. */
export const escalonamento = 0.05;
