/**
 * Os números "de sempre": quanto já foi concluído em toda a vida da conta.
 *
 * Existe porque a faxina do servidor apaga tarefas concluídas depois de 4
 * dias. Somar as que ainda aparecem produzia uma taxa que só caía: quem tinha
 * 50 tarefas abertas e 200 concluídas ao longo do ano via "6% de conclusão",
 * porque das 200 só as dos últimos 4 dias ainda existiam. Quanto mais a pessoa
 * usava o app, pior o número ficava.
 *
 * O total de concluídas passa a vir do servidor (`account.completedTasks`),
 * que é um contador vitalício. As abertas continuam sendo contadas aqui — elas
 * não são apagadas, então o que está na tela é o que existe.
 */
export interface Conclusao {
  /** Concluídas em toda a vida da conta. */
  concluidas: number;
  /** Abertas agora (pendentes, em andamento, atrasadas). */
  abertas: number;
  /** Tudo o que já foi assumido: concluídas + abertas. */
  total: number;
  /** 0–100. Sem nenhuma tarefa => 0. */
  taxa: number;
}

export function resumoDeConclusao(concluidas: number, abertas: number): Conclusao {
  // Um contador não pode ser negativo nem fracionário — ele vem do banco e de
  // uma sessão salva no navegador, e nenhum dos dois é confiável o bastante
  // para dividir sem conferir.
  const feitas = Math.max(0, Math.floor(concluidas) || 0);
  const emAberto = Math.max(0, Math.floor(abertas) || 0);
  const total = feitas + emAberto;
  return {
    concluidas: feitas,
    abertas: emAberto,
    total,
    taxa: total === 0 ? 0 : Math.round((feitas / total) * 100),
  };
}
