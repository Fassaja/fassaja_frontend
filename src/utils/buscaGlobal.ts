/**
 * Pontuação e recorte de texto da busca rápida (⌘K / Ctrl+K).
 *
 * Duas decisões guiam tudo aqui:
 *
 * 1. **Acento não separa resultado.** Quem digita rápido escreve "reuniao" e
 *    "orcamento". Exigir o acento faz a busca parecer quebrada justamente com
 *    quem usa mais.
 * 2. **Se casou pela descrição, isso tem que aparecer.** Um resultado cujo
 *    título nada tem a ver com o que foi digitado parece erro — a menos que
 *    a linha mostre o pedaço do texto que casou.
 */

/**
 * Minúsculas e sem acento.
 *
 * O comprimento é preservado: cada letra acentuada vira base + marca de
 * combinação, e a marca é removida em seguida. Isso deixa os índices do texto
 * normalizado válidos no texto ORIGINAL — é o que permite recortar o trecho
 * com os acentos e as maiúsculas intactos.
 */
export function normalizar(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export interface Campos {
  titulo: string;
  /** Descrição, conteúdo, local — o que for texto secundário. */
  corpo?: string;
}

/**
 * Quão bem o item responde ao termo. `null` = não responde.
 *
 * A escala existe para o que a pessoa procurava ficar em cima. Título vale
 * mais que corpo, e começo vale mais que meio: quem digita "rel" quer
 * "Relatório", não "Corrigir o relógio da sala".
 */
export function pontuar(campos: Campos, termo: string): number | null {
  const t = normalizar(termo.trim());
  if (!t) return 0; // sem termo, tudo empata e vale a ordem de quem chamou

  const titulo = normalizar(campos.titulo);
  if (titulo === t) return 100;
  if (titulo.startsWith(t)) return 80;
  // Começo de qualquer palavra do título: "orc" acha "Revisar orçamento".
  if (new RegExp(`\\b${escaparRegex(t)}`).test(titulo)) return 60;
  if (titulo.includes(t)) return 40;

  if (campos.corpo && normalizar(campos.corpo).includes(t)) return 15;
  return null;
}

function escaparRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Pedaço do corpo ao redor do que casou, para explicar por que o item apareceu.
 *
 * Devolve `null` quando o corpo não casa — inclusive quando quem casou foi o
 * título, e aí não há nada a explicar.
 */
export function trecho(corpo: string | undefined, termo: string, raio = 36): string | null {
  const t = normalizar(termo.trim());
  if (!corpo || !t) return null;
  const i = normalizar(corpo).indexOf(t);
  if (i === -1) return null;

  const ini = Math.max(0, i - raio);
  const fim = Math.min(corpo.length, i + t.length + raio);
  // As reticências dizem que o texto continua; sem elas o corte parece o fim
  // da frase e muda o sentido do que está escrito.
  return (
    (ini > 0 ? '…' : '') +
    corpo.slice(ini, fim).replace(/\s+/g, ' ').trim() +
    (fim < corpo.length ? '…' : '')
  );
}

/**
 * Filtra e ordena, mantendo a ordem original entre empates.
 *
 * `Array.prototype.sort` é estável, então itens de mesma pontuação saem na
 * ordem em que chegaram — normalmente a do servidor, que já é a mais recente
 * primeiro. Sem isso a lista embaralharia a cada tecla.
 */
export function buscar<T>(
  itens: T[],
  termo: string,
  campos: (item: T) => Campos,
  limite: number,
): T[] {
  const comPontos = itens
    .map(item => ({ item, pontos: pontuar(campos(item), termo) }))
    .filter((r): r is { item: T; pontos: number } => r.pontos !== null);

  comPontos.sort((a, b) => b.pontos - a.pontos);
  return comPontos.slice(0, limite).map(r => r.item);
}
