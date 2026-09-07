/**
 * Identidade de sessão: a chave que diz de QUEM é um dado em memória.
 *
 * ## O problema (FE-01)
 *
 * Os provedores de dados (tarefas, projetos, tags, eventos, ideias…) ficam
 * montados acima das rotas e vivem a sessão inteira. Cada um disparava seu
 * fetch e chamava `setState` na resposta, sem perguntar de quem era aquele
 * pedido. A dependência era só `isGuest`, um booleano: sair da conta A e
 * entrar na conta B não muda esse valor, e a resposta antiga — que já estava
 * viajando — repovoava a tela com dados de A.
 *
 * Só `AbortController` não resolve: ele corta o transporte, mas um callback
 * que já resolveu continua correndo, e o mesmo vale para os `catch` e para os
 * rollbacks das ações otimistas, que guardam uma cópia do estado ANTERIOR.
 *
 * ## A régua
 *
 * Toda ida ao servidor nasce carimbada com a identidade vigente. Na volta —
 * sucesso, erro ou desfazimento — o carimbo é comparado com a identidade
 * ATUAL. Se mudou, o resultado é descartado inteiro: não vira estado, não vira
 * erro na tela e não desliga o "carregando" de outra sessão.
 *
 * A identidade inclui uma GERAÇÃO, e não só o id da conta: sair e entrar na
 * mesma conta também precisa invalidar o que estava em voo (o servidor pode
 * ter revogado a sessão; e o mesmo id não prova o mesmo cookie).
 */

/** Id usado quando não há conta. Não é o id de ninguém — é a ausência dele. */
export const CONTA_VISITANTE = 'visitante';

/** A identidade é opaca para quem usa: só serve para comparar por igualdade. */
export type Identidade = string;

/** Monta a identidade a partir da conta atual e da geração da sessão. */
export function identidadeDe(contaId: string | null | undefined, geracao: number): Identidade {
  return `${contaId ?? CONTA_VISITANTE}#${geracao}`;
}

/** O id da conta dentro de uma identidade (`visitante` quando não há conta). */
export function contaDaIdentidade(identidade: Identidade): string {
  return identidade.split('#')[0];
}

/**
 * A resposta ainda pertence à sessão que está na tela?
 *
 * Uma função de uma linha — mas é ELA que separa "dado desta pessoa" de "dado
 * de quem usou este navegador antes", e por isso mora num lugar com nome e
 * teste em vez de repetida em cada provedor.
 */
export function aindaVale(daResposta: Identidade, atual: Identidade): boolean {
  return daResposta === atual;
}

interface Carga<T> {
  /** Identidade no momento em que o pedido saiu. */
  identidade: Identidade;
  /** Lê a identidade ATUAL na hora da volta (uma ref, nunca um valor capturado). */
  atual: () => Identidade;
  buscar: () => Promise<T>;
  aoReceber: (dados: T) => void;
  aoFalhar?: (erro: Error) => void;
  /** Roda no fim, apenas se a carga ainda pertence à sessão vigente. */
  aoTerminar?: () => void;
}

/**
 * Executa uma carga e só deixa o resultado tocar o estado se a identidade não
 * mudou no meio do caminho.
 *
 * É o corpo real usado pelos provedores — não uma abstração paralela — para
 * que o teste desta função teste o que roda em produção.
 */
export async function carregarSePertence<T>(carga: Carga<T>): Promise<void> {
  try {
    const dados = await carga.buscar();
    if (!aindaVale(carga.identidade, carga.atual())) return;
    carga.aoReceber(dados);
  } catch (erro) {
    if (!aindaVale(carga.identidade, carga.atual())) return;
    carga.aoFalhar?.(erro as Error);
  } finally {
    if (aindaVale(carga.identidade, carga.atual())) carga.aoTerminar?.();
  }
}

/**
 * Aplica um efeito (setState, rollback, toast) somente se a identidade
 * carimbada ainda for a vigente. Para os pontos que não são uma carga inteira:
 * o desfazimento de uma ação otimista, a resposta de uma mutação.
 */
export function aplicarSePertence(
  identidade: Identidade,
  atual: () => Identidade,
  efeito: () => void,
): void {
  if (aindaVale(identidade, atual())) efeito();
}
