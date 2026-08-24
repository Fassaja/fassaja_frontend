/**
 * Quanto falta, lido do RELÓGIO — nunca de um contador.
 *
 * Um contador (`setInterval` decrementando) parece funcionar e mente na hora
 * que importa: navegador estrangula temporizador em aba de fundo, e celular
 * bloqueado congela a página. A pessoa volta depois de vinte minutos e o
 * número mal andou.
 *
 * Aqui o intervalo só serve para REDESENHAR; o valor sai sempre da subtração
 * entre o fim e agora. Trocar de aba, bloquear o celular ou recarregar não
 * muda o resultado, porque nada depende de ninguém ter contado.
 */
export function segundosAte(fimISO: string, agora: Date = new Date()): number {
  const fim = new Date(fimISO).getTime();
  if (Number.isNaN(fim)) return 0;
  return Math.max(0, Math.ceil((fim - agora.getTime()) / 1000));
}

/** 'MM:SS' — e 'H:MM:SS' quando passa de uma hora. */
export function formatarRelogio(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  const dois = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${dois(m)}:${dois(seg)}` : `${dois(m)}:${dois(seg)}`;
}

/** 0–100. Quanto da sessão já passou — para o anel de progresso. */
export function progressoDaSessao(
  inicioISO: string,
  fimISO: string,
  agora: Date = new Date(),
): number {
  const inicio = new Date(inicioISO).getTime();
  const fim = new Date(fimISO).getTime();
  const total = fim - inicio;
  if (!Number.isFinite(total) || total <= 0) return 100;
  const decorrido = agora.getTime() - inicio;
  return Math.min(100, Math.max(0, Math.round((decorrido / total) * 100)));
}
