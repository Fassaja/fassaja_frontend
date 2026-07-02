import { Task } from '@/types/task';
import { isThisWeek, toISODate, todayISO } from './date';

/**
 * Marcos de celebração disparados ao concluir uma tarefa.
 *
 * Cada marco comemora UMA vez (dedupe via localStorage):
 *  - Primeiro projeto 100% concluído: uma vez por conta/navegador.
 *  - 7 dias de sequência: uma vez por dia em que a sequência vale 7
 *    (uma nova sequência que chegar a 7 comemora de novo).
 *  - 10 tarefas concluídas na semana: uma vez por semana.
 *
 * Retorna a mensagem do marco (para celebrate(msg, 'goal')) ou null.
 */

const FIRST_PROJECT_KEY = 'fassaja_ms_first_project';
const STREAK7_PREFIX = 'fassaja_ms_streak7_';
const WEEK10_PREFIX = 'fassaja_ms_week10_';

/** Domingo desta semana como YYYY-MM-DD (identifica a semana no dedupe). */
function weekKey(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return toISODate(d);
}

function seen(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return true; // sem localStorage não dá para dedupar: não comemora
  }
}

function mark(key: string): void {
  try {
    localStorage.setItem(key, '1');
  } catch {
    /* ignora */
  }
}

interface MilestoneInput {
  /** Lista de tarefas JÁ com a conclusão aplicada. */
  tasks: Task[];
  /** A tarefa que acabou de ser concluída. */
  completedTask: Task;
  /** Sequência de dias produtivos, contando hoje. */
  streak: number;
}

export function detectMilestone({ tasks, completedTask, streak }: MilestoneInput): string | null {
  // 1) Primeiro projeto 100% concluído (o mais raro primeiro).
  if (completedTask.projectId && !seen(FIRST_PROJECT_KEY)) {
    const projectTasks = tasks.filter(t => t.projectId === completedTask.projectId);
    if (projectTasks.length > 0 && projectTasks.every(t => t.status === 'completed')) {
      mark(FIRST_PROJECT_KEY);
      return 'Primeiro projeto 100% concluído! 🏆';
    }
  }

  // 2) Sequência de 7 dias.
  if (streak === 7 && !seen(STREAK7_PREFIX + todayISO())) {
    mark(STREAK7_PREFIX + todayISO());
    return '7 dias de sequência! 🔥';
  }

  // 3) 10ª tarefa concluída na semana.
  const weekCompleted = tasks.filter(
    t => t.status === 'completed' && t.completedAt && isThisWeek(t.completedAt),
  ).length;
  if (weekCompleted === 10 && !seen(WEEK10_PREFIX + weekKey())) {
    mark(WEEK10_PREFIX + weekKey());
    return '10 tarefas concluídas na semana! 🚀';
  }

  return null;
}
