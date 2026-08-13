import type { Task } from '@/types/task';
import type { Idea } from '@/types/idea';
// Relativo e com extensão, como em postLoginRedirect/teamReport: é o que
// permite rodar este módulo direto no Node nos testes, sem o alias do Vite.
import { formatDate, isToday, isTomorrow } from './date.ts';
import { isReviewDue, isUnblocked, formatStartTarget, statusMeta } from './ideaStatus.ts';

/**
 * Síntese exibida no painel que desliza sob o card de projeto/ideia.
 *
 * A regra que orienta tudo aqui: NÃO repetir o que o card já mostra. O card do
 * projeto já traz progresso, total de tarefas e concluídas; repetir isso faria
 * do painel um enfeite. O que ele responde é outra coisa — "o que me espera se
 * eu abrir isto agora".
 */
export interface CardSummary {
  headline: string;
  detail?: string;
  /** 'alert' pede ação, 'positive' é conclusão, 'neutral' é informação. */
  tone: 'alert' | 'positive' | 'neutral';
}

/** Rótulo curto de prazo, relativo quando perto. */
function dueLabel(dueDate: string): string {
  if (isToday(dueDate)) return 'hoje';
  if (isTomorrow(dueDate)) return 'amanhã';
  return formatDate(dueDate);
}

/**
 * O que espera quem abrir este projeto.
 *
 * `tasks` são apenas as tarefas DESTE projeto — filtrar é responsabilidade de
 * quem chama, que já tem a lista em mãos.
 */
export function projectSummary(tasks: Task[]): CardSummary {
  if (tasks.length === 0) {
    return {
      headline: 'Nenhuma tarefa ainda',
      detail: 'Abra para criar a primeira.',
      tone: 'neutral',
    };
  }

  const pendentes = tasks.filter(t => t.status !== 'completed');

  if (pendentes.length === 0) {
    return { headline: 'Tudo concluído', detail: 'Nada em aberto por aqui.', tone: 'positive' };
  }

  const atrasadas = pendentes.filter(t => t.status === 'overdue');

  // A próxima com prazo, entre as que ainda não venceram.
  const proxima = pendentes
    .filter(t => t.dueDate && t.status !== 'overdue')
    .sort((a, b) => (a.dueDate as string).localeCompare(b.dueDate as string))[0];

  if (atrasadas.length > 0) {
    return {
      headline: `${atrasadas.length} ${atrasadas.length === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'}`,
      detail: proxima
        ? `A próxima vence ${dueLabel(proxima.dueDate as string)}.`
        : `${pendentes.length} em aberto no total.`,
      tone: 'alert',
    };
  }

  if (proxima) {
    return {
      headline: `Vence ${dueLabel(proxima.dueDate as string)}`,
      detail: proxima.title,
      tone: 'neutral',
    };
  }

  return {
    headline: `${pendentes.length} ${pendentes.length === 1 ? 'tarefa em aberto' : 'tarefas em aberto'}`,
    detail: 'Nenhuma tem prazo definido.',
    tone: 'neutral',
  };
}

/** O que espera quem abrir esta ideia. */
export function ideaSummary(idea: Idea, now: number = Date.now()): CardSummary {
  if (idea.status === 'convertida') {
    return { headline: 'Virou projeto', detail: 'Já está em execução.', tone: 'positive' };
  }

  // Atenção: `isUnblocked` responde "estava travada e foi LIBERADA", não "não
  // tem trava". Bloqueio de verdade é ter dependência ainda não concluída.
  const bloqueada = !!idea.dependsOnProjectId && idea.dependsOnProjectCompleted !== true;

  if (bloqueada) {
    return {
      headline: 'Esperando outro projeto',
      detail: idea.dependsOnProjectName
        ? `Depende de "${idea.dependsOnProjectName}" terminar.`
        : 'Depende de um projeto em andamento.',
      tone: 'neutral',
    };
  }

  // Dependência concluída: é o momento em que a ideia passa a ser acionável.
  if (isUnblocked(idea)) {
    return {
      headline: 'Liberada para começar',
      detail: idea.dependsOnProjectName
        ? `"${idea.dependsOnProjectName}" foi concluído.`
        : 'O projeto de que ela dependia terminou.',
      tone: 'positive',
    };
  }

  if (isReviewDue(idea, now)) {
    return {
      headline: 'Revisão atrasada',
      detail: 'Você marcou para revisar esta ideia e a data já passou.',
      tone: 'alert',
    };
  }

  if (idea.reviewAt) {
    return {
      headline: `Revisar em ${formatDate(idea.reviewAt.slice(0, 10))}`,
      detail: statusMeta(idea.status).hint,
      tone: 'neutral',
    };
  }

  const previsao = formatStartTarget(idea.startTarget);
  if (previsao) {
    return {
      headline: `Previsto para ${previsao}`,
      detail: statusMeta(idea.status).hint,
      tone: 'neutral',
    };
  }

  return {
    headline: statusMeta(idea.status).label,
    detail: statusMeta(idea.status).hint,
    tone: 'neutral',
  };
}
