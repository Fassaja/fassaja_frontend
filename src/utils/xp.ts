import { Task } from '@/types/task';

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

/** Calcula XP/nível a partir das tarefas concluídas (fonte única para Dashboard e Relatórios). */
export function computeXp(tasks: Task[]): XpInfo {
  const completed = tasks.filter(t => t.status === 'completed');
  const xp = completed.reduce((sum, t) => sum + POINTS[t.priority], 0);
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const intoLevel = xp % XP_PER_LEVEL;
  const pctToNext = Math.round((intoLevel / XP_PER_LEVEL) * 100);
  return { xp, level, intoLevel, pctToNext, completedCount: completed.length };
}
