/**
 * Atalhos de teclado que funcionam nos dois mundos.
 *
 * A tecla de comando muda de nome e de símbolo conforme o sistema: no Mac é
 * ⌘, no Windows e no Linux é Ctrl. Mostrar "⌘K" para quem está no Windows não
 * é só feio — é uma instrução que não funciona.
 */

/** A plataforma como o navegador informa. Separado para o teste não depender do navigator. */
export function ehMac(plataforma: string): boolean {
  return /mac|iphone|ipad|ipod/i.test(plataforma);
}

/** Como escrever o atalho para quem está lendo. Ex.: '⌘K' ou 'Ctrl K'. */
export function rotuloAtalho(tecla: string, plataforma: string): string {
  return ehMac(plataforma) ? `⌘${tecla.toUpperCase()}` : `Ctrl ${tecla.toUpperCase()}`;
}

/**
 * O atalho quebrado em teclas, uma por chip: ['⌘','K'] ou ['Ctrl','K'].
 *
 * Separado do `rotuloAtalho` porque são usos diferentes: texto corrido (dica,
 * leitor de tela) precisa de uma string só; a tela desenha uma tecla por
 * quadradinho, como o teclado de verdade.
 */
export function partesDoAtalho(tecla: string, plataforma: string): string[] {
  return [ehMac(plataforma) ? '⌘' : 'Ctrl', tecla.toUpperCase()];
}

/**
 * O que o navegador diz sobre a plataforma.
 *
 * `userAgentData` é o caminho novo; `platform` está obsoleto mas ainda é o
 * único disponível no Safari e no Firefox. O `userAgent` fecha a conta.
 */
export function plataformaAtual(): string {
  if (typeof navigator === 'undefined') return '';
  const dados = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  return dados?.platform || navigator.platform || navigator.userAgent || '';
}

// ---------------------------------------------------------------------------
// Atalhos de uma tecla (desktop)
//
// Letra simples, como no Gmail e no Linear: `N` cria, `/` busca, `?` mostra a
// lista, e `G` seguido de uma letra vai para uma área. Só valem fora de campos
// de texto e sem modal aberto — quem decide isso é o hook que escuta o
// teclado; aqui fica só "esta tecla, neste estado, faz o quê", que é o que dá
// para testar sem navegador.
//
// Podem ser desligados na própria lista de atalhos (WCAG 2.1.4: atalho de uma
// tecla só precisa ter como ser desligado).
// ---------------------------------------------------------------------------

export type AcaoDeAtalho =
  | { tipo: 'nova-tarefa' }
  | { tipo: 'buscar' }
  | { tipo: 'ajuda' }
  | { tipo: 'ir'; rota: string };

/** `G` + letra: para onde vai. A ordem é a da lista de atalhos. */
export const DESTINOS_DO_G: { tecla: string; rota: string; nome: string }[] = [
  { tecla: 'd', rota: '/', nome: 'Dashboard' },
  { tecla: 't', rota: '/tasks', nome: 'Minhas Tarefas' },
  { tecla: 'p', rota: '/projects', nome: 'Projetos' },
  { tecla: 'a', rota: '/agenda', nome: 'Agenda' },
  { tecla: 'c', rota: '/calendar', nome: 'Calendário' },
  { tecla: 'f', rota: '/focus', nome: 'Foco' },
  { tecla: 'i', rota: '/ideas', nome: 'Ideias' },
  { tecla: 'r', rota: '/reports', nome: 'Relatórios' },
];

export interface TeclaPressionada {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}

/**
 * Resolve uma tecla. `gPendente` diz se a tecla anterior foi um `G` ainda
 * esperando a segunda letra; o retorno traz o novo valor dele.
 */
export function resolverAtalho(
  t: TeclaPressionada,
  gPendente: boolean,
): { acao: AcaoDeAtalho | null; gPendente: boolean } {
  // Com Ctrl/⌘/Alt é atalho do navegador ou do sistema (copiar, abrir aba…).
  if (t.ctrlKey || t.metaKey || t.altKey) return { acao: null, gPendente: false };

  const tecla = t.key.length === 1 ? t.key.toLowerCase() : t.key;

  if (gPendente) {
    const destino = DESTINOS_DO_G.find(d => d.tecla === tecla);
    return { acao: destino ? { tipo: 'ir', rota: destino.rota } : null, gPendente: false };
  }

  switch (tecla) {
    case 'g':
      return { acao: null, gPendente: true };
    case 'n':
      return { acao: { tipo: 'nova-tarefa' }, gPendente: false };
    case '/':
      return { acao: { tipo: 'buscar' }, gPendente: false };
    case '?':
      return { acao: { tipo: 'ajuda' }, gPendente: false };
    default:
      return { acao: null, gPendente: false };
  }
}

/** Tempo para a segunda letra depois do `G`, em ms. */
export const ESPERA_DO_G_MS = 1200;

const CHAVE_DESLIGADOS = 'fassaja_atalhos_desligados';

export function atalhosLigados(): boolean {
  try {
    return localStorage.getItem(CHAVE_DESLIGADOS) !== '1';
  } catch {
    return true;
  }
}

export function definirAtalhosLigados(ligados: boolean): void {
  try {
    if (ligados) localStorage.removeItem(CHAVE_DESLIGADOS);
    else localStorage.setItem(CHAVE_DESLIGADOS, '1');
  } catch {
    /* sem armazenamento: vale só nesta visita */
  }
}

/** Evento para abrir a lista de atalhos de qualquer lugar (ex.: menu da conta). */
export const ABRIR_ATALHOS_EVENT = 'fassaja:abrir-atalhos';
