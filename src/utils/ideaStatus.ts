import type { Idea, IdeaStatus, IdeaPriority } from '@/types/idea';

/**
 * Vocabulário visual das ideias: rótulo, cor e ordem de cada estágio.
 *
 * Fica em utils/ (e não espalhado nos componentes) porque cartão, filtros e
 * resumo precisam concordar — status com nome diferente em dois lugares parece
 * dois status diferentes para quem lê.
 */
export interface StatusMeta {
  value: IdeaStatus;
  label: string;
  color: string;
  /** Explicação curta, usada no seletor de status. */
  hint: string;
}

// A ordem é a do fluxo: rascunho → avaliando → planejada → pronta → convertida.
// `arquivada` fica por último por ser saída, não etapa.
export const IDEA_STATUS_META: StatusMeta[] = [
  { value: 'rascunho', label: 'Rascunho', color: '#64748B', hint: 'Anotada, ainda não avaliada' },
  { value: 'avaliando', label: 'Em avaliação', color: '#FBBF24', hint: 'Pensando se vale a pena' },
  { value: 'planejada', label: 'Planejada', color: '#8B5CF6', hint: 'Vai acontecer, com previsão' },
  { value: 'pronta', label: 'Pronta para começar', color: '#22C55E', hint: 'Condições atendidas' },
  { value: 'convertida', label: 'Virou projeto', color: '#2477FF', hint: 'Já está em execução' },
  { value: 'arquivada', label: 'Arquivada', color: '#94A3B8', hint: 'Guardada, sem prazo' },
];

/** Os que a pessoa pode escolher — `convertida` é só do servidor. */
export const SELECTABLE_STATUS = IDEA_STATUS_META.filter(s => s.value !== 'convertida');

export function statusMeta(status: IdeaStatus): StatusMeta {
  return IDEA_STATUS_META.find(s => s.value === status) ?? IDEA_STATUS_META[0];
}

export const PRIORITY_LABEL: Record<IdeaPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/**
 * Formata a previsão de início para leitura.
 *
 * Aceita os dois formatos que o back-end grava e trata a string à mão em vez de
 * usar `new Date()`: '2026-11-15' vira 14/11 em quem está a oeste de Greenwich,
 * porque o JS lê a data ISO curta como UTC.
 */
export function formatStartTarget(startTarget?: string): string | null {
  if (!startTarget) return null;
  const [ano, mes, dia] = startTarget.split('-');
  const nomeMes = MESES[Number(mes) - 1];
  if (!nomeMes) return null;
  return dia ? `${dia}/${mes}/${ano}` : `${nomeMes} de ${ano}`;
}

/**
 * Opções de mês para a previsão de início ("novembro de 2026").
 *
 * Existe porque `<input type="month">` NÃO é suportado pelo Safari: lá ele
 * vira um campo de texto comum, onde a pessoa vê "2026-09" cru e pode digitar
 * qualquer coisa. Uma lista fechada funciona em todo navegador e ainda mostra
 * o mês por extenso.
 */
export function monthOptions(
  quantos = 24,
  from: Date = new Date(),
): { value: string; label: string }[] {
  const opcoes: { value: string; label: string }[] = [];
  const base = new Date(from.getFullYear(), from.getMonth(), 1);
  for (let i = 0; i < quantos; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    opcoes.push({
      value: `${d.getFullYear()}-${mes}`,
      label: `${MESES[d.getMonth()]} de ${d.getFullYear()}`,
    });
  }
  return opcoes;
}

/**
 * A ideia está esperando um projeto que já terminou?
 *
 * É o gatilho de "pode começar": a condição foi atendida e ninguém avisaria a
 * pessoa se ela não abrisse a tela.
 */
export function isUnblocked(idea: Idea): boolean {
  return !!idea.dependsOnProjectId && idea.dependsOnProjectCompleted === true;
}

/** Ideia cuja data de revisão já passou. */
export function isReviewDue(idea: Idea, now: number = Date.now()): boolean {
  if (!idea.reviewAt) return false;
  const quando = new Date(idea.reviewAt).getTime();
  if (Number.isNaN(quando)) return false;
  return quando <= now;
}

/**
 * Ideias que pedem atenção agora: a revisão venceu ou a dependência terminou.
 * Convertidas e arquivadas ficam de fora — não há o que decidir nelas.
 */
export function needsAttention(idea: Idea, now: number = Date.now()): boolean {
  if (idea.status === 'convertida' || idea.status === 'arquivada') return false;
  return isReviewDue(idea, now) || isUnblocked(idea);
}

export interface IdeaCounts {
  total: number;
  planejadas: number;
  prontas: number;
  arquivadas: number;
}

/** Resumo do topo da página. */
export function countIdeas(ideas: Idea[]): IdeaCounts {
  return {
    // O total ignora arquivadas: são o que a pessoa decidiu não tocar agora, e
    // contá-las inflaria a sensação de "quantas ideias eu tenho".
    total: ideas.filter(i => i.status !== 'arquivada').length,
    planejadas: ideas.filter(i => i.status === 'planejada').length,
    prontas: ideas.filter(i => i.status === 'pronta').length,
    arquivadas: ideas.filter(i => i.status === 'arquivada').length,
  };
}
