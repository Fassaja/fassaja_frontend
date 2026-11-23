import { useState } from 'react';

/**
 * `true` a partir da primeira vez que `aberto` foi `true`, e para sempre.
 *
 * Para modais carregados sob demanda: o arquivo do modal só é pedido quando a
 * pessoa o abre pela primeira vez. Depois disso ele continua montado mesmo
 * fechado — desmontar no fechamento cortaria a animação de saída, e reabrir
 * não deve esperar nada.
 *
 * Ajustar o estado durante o render (e não num efeito) é o padrão do React
 * para estado derivado de prop: evita um render a mais com o modal ausente.
 */
export function useMontadoAoAbrir(aberto: boolean): boolean {
  const [montado, setMontado] = useState(aberto);
  if (aberto && !montado) setMontado(true);
  return montado || aberto;
}
