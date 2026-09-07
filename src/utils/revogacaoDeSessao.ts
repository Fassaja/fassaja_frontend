/**
 * Saída LOCAL e revogação REMOTA são duas coisas diferentes (FE-07).
 *
 * O `logout` antigo disparava `POST /auth/logout` sem esperar e engolia a
 * falha. Duas consequências:
 *
 * 1. O cookie httpOnly podia continuar válido no servidor sem que nada na tela
 *    dissesse isso. A pessoa "saiu", mas a sessão remota seguia viva — e o
 *    cookie não pode ser apagado por JavaScript, então não havia plano B.
 * 2. Uma resposta atrasada podia derrubar o login SEGUINTE: pedido de logout
 *    ainda em trânsito, a pessoa entra de novo, e a revogação chega ao servidor
 *    depois do novo login, apagando o cookie novo.
 *
 * A régua aqui:
 *
 * - a limpeza local é imediata e incondicional (nada abaixo a bloqueia);
 * - a revogação é UMA tentativa, sem repetição automática — repetir é
 *   exatamente o que arrisca revogar a sessão nova;
 * - quem for começar uma sessão nova ESPERA a revogação pendente terminar,
 *   com prazo. Esperar a RESPOSTA antes de mandar o login é o que garante a
 *   ordem no servidor;
 * - o resultado é explícito: 'confirmada' ou 'sem-resposta'. Não se afirma que
 *   a sessão remota morreu quando ninguém confirmou.
 *
 * Módulo puro (sem React, sem fetch próprio) para ser testável em Node.
 */

export type ResultadoDaRevogacao = 'confirmada' | 'sem-resposta';

let pendente: Promise<ResultadoDaRevogacao> | null = null;
let ultimo: ResultadoDaRevogacao | null = null;

/**
 * Registra uma revogação em andamento. `pedir` é quem fala com o servidor.
 * Nunca rejeita: falha de rede vira 'sem-resposta'.
 */
export function revogarSessao(
  pedir: () => Promise<unknown>,
): Promise<ResultadoDaRevogacao> {
  const corrida = pedir().then(
    () => 'confirmada' as const,
    () => 'sem-resposta' as const,
  );
  const registrada = corrida.then(resultado => {
    ultimo = resultado;
    // Só limpa se ninguém tomou o lugar no meio-tempo.
    if (pendente === registrada) pendente = null;
    return resultado;
  });
  pendente = registrada;
  return registrada;
}

/**
 * Espera a revogação pendente (se houver) antes de abrir uma sessão nova.
 *
 * Com prazo: uma rede pendurada não pode deixar a pessoa sem conseguir entrar.
 * Estourar o prazo devolve 'sem-resposta' — e quem chama segue com o login,
 * ciente de que a ordem no servidor deixou de ser garantida.
 */
export function aguardarRevogacaoPendente(
  limiteMs = 3000,
  agendar: (fn: () => void, ms: number) => unknown = setTimeout,
): Promise<ResultadoDaRevogacao | 'sem-revogacao' | 'prazo-esgotado'> {
  if (!pendente) return Promise.resolve('sem-revogacao');
  const prazo = new Promise<'prazo-esgotado'>(resolve => {
    agendar(() => resolve('prazo-esgotado'), limiteMs);
  });
  return Promise.race([pendente, prazo]);
}

/** O que se sabe da última revogação. `null` = nunca houve uma nesta aba. */
export function ultimaRevogacao(): ResultadoDaRevogacao | null {
  return ultimo;
}

/** Só para os testes: zera o estado do módulo entre cenários. */
export function _reiniciarRevogacao(): void {
  pendente = null;
  ultimo = null;
}
