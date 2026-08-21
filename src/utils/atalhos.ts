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
