import type { Task } from '@/types/task';

// Pontos por tarefa concluída, ponderados pela prioridade.
const POINTS: Record<Task['priority'], number> = { low: 10, medium: 20, high: 30 };
export const XP_PER_LEVEL = 100;

export interface XpInfo {
  xp: number;
  level: number;
  intoLevel: number;
  pctToNext: number;
  completedCount: number;
}

/**
 * Traduz um total de XP em nível e barra de progresso.
 *
 * O TOTAL vem do servidor (`account.xp`) e não é somado aqui. Antes esta função
 * percorria as tarefas concluídas — e o servidor apaga concluídas depois de 4
 * dias, então o nível CAÍA com o tempo: 200 XP e nível 3 viravam 80 XP e nível
 * 1 em quatro dias. Ver o comentário de `xp` no schema do back.
 */
export function xpInfo(xp: number, completedCount = 0): XpInfo {
  const total = Math.max(0, xp);
  const level = Math.floor(total / XP_PER_LEVEL) + 1;
  const intoLevel = total % XP_PER_LEVEL;
  const pctToNext = Math.round((intoLevel / XP_PER_LEVEL) * 100);
  return { xp: total, level, intoLevel, pctToNext, completedCount };
}

/**
 * Soma o XP das tarefas em memória.
 *
 * Continua existindo para o modo VISITANTE, que não tem conta no servidor e
 * guarda tudo no navegador — ali não há faxina, então a soma local é a única
 * fonte e permanece correta. Quem tem conta usa `xpInfo(account.xp)`.
 */
export function computeXp(tasks: Task[]): XpInfo {
  const completed = tasks.filter(t => t.status === 'completed');
  const xp = completed.reduce((sum, t) => sum + (POINTS[t.priority] ?? 0), 0);
  return xpInfo(xp, completed.length);
}
