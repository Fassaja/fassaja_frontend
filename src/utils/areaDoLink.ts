// `import type` (e não import normal) porque o teste roda em Node puro, sem o
// resolvedor de alias do Vite: tipo é apagado na compilação, valor não seria.
import type { Workspace } from '@/services/workspacesService';
import type { TaskScope } from '@/utils/taskScope';

/** O que o link pediu. `scope` nulo = o link não disse o lado. */
export interface PedidoDoLink {
  filterProject: string;
  scope: TaskScope | null;
}

/**
 * Quantas condições a área impõe além do projeto e do lado.
 *
 * Serve para desempatar: entre duas áreas do mesmo projeto, a mais "limpa" é
 * a que representa o projeto inteiro, e é ela que alguém espera ao clicar em
 * "Ver tarefas". A outra é um recorte de dentro dele.
 */
function restricoes(a: Workspace): number {
  return (
    (a.filterStatus !== 'all' ? 1 : 0) +
    (a.filterPriority !== 'all' ? 1 : 0) +
    a.filterTags.length
  );
}

/**
 * A área de trabalho que já representa o que o link pediu, se existir.
 *
 * Clicar em "Ver tarefas" de um projeto que já tem área própria deve ABRIR
 * aquela área — com a aba marcada na barra —, não montar um recorte solto
 * igualzinho a ela com "Início" aceso. Eram o mesmo conteúdo com duas
 * aparências diferentes, e a segunda ainda perdia o que a área guarda de
 * resto (visão, status, tags).
 *
 * Devolve `null` quando nada corresponde: aí valem os filtros do link mesmo.
 */
export function areaParaOLink(lista: Workspace[], pedido: PedidoDoLink): Workspace | null {
  const candidatas = lista.filter(a => {
    if (a.filterProject !== pedido.filterProject) return false;
    // Lado não dito no link não desempata nada; dito, tem que bater.
    return pedido.scope === null || a.scope === pedido.scope;
  });
  if (candidatas.length === 0) return null;

  // Empate no número de restrições cai na ordem da barra, que é a que a
  // pessoa vê — assim a escolha é sempre a mesma e dá para prever.
  return candidatas.reduce((melhor, a) => {
    const d = restricoes(a) - restricoes(melhor);
    if (d !== 0) return d < 0 ? a : melhor;
    return a.order < melhor.order ? a : melhor;
  });
}
