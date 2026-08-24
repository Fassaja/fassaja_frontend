import { useMemo } from 'react';
import { Task } from '@/types/task';

// Variação vs semana passada. percent pode ser negativo; good = cor verde.
export interface WeekChange {
  percent: number;
  good: boolean;
}

interface DashboardStats {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  pending: number;
  completionRate: number;
  thisWeekCompleted: number;
  lastWeekCompleted: number;
  weekComparisonPercent: number;
  comparisons: {
    total: WeekChange;
    completed: WeekChange;
    inProgress: WeekChange;
    overdue: WeekChange;
  };
}

// Sem base na semana passada (usuário novo) => 0%. Senão, variação percentual.
function weekChange(thisW: number, lastW: number, upIsGood: boolean): WeekChange {
  if (lastW === 0) return { percent: 0, good: true };
  const percent = Math.round(((thisW - lastW) / lastW) * 100);
  const good = upIsGood ? percent >= 0 : percent <= 0;
  return { percent, good };
}

/**
 * `semana` vem do histórico do servidor e é opcional.
 *
 * Quando presente, "esta semana" e "semana passada" saem dele — e é o único
 * jeito de estarem certos, porque a faxina apaga as concluídas depois de 4
 * dias e a semana passada já não existe na lista. Era isso que fazia a
 * comparação exibir "+100%" toda semana, para todo mundo: a base era zero.
 *
 * Sem ele (visitante, ou tela que não busca histórico), vale a contagem local,
 * que ali é a correta — as tarefas do visitante não passam por faxina.
 */
export function useDashboardStats(
  tasks: Task[],
  semana?: { estaSemana: number; semanaPassada: number },
): DashboardStats {
  return useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // Segunda-feira, como no resto do app. Aqui a semana começava no DOMINGO,
    // e "esta semana" significava duas coisas diferentes na mesma tela.
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);

    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const overdue = tasks.filter(t => t.status === 'overdue').length;
    const pending = tasks.filter(t => t.status === 'pending').length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const contarLocal = (de: Date, ate: Date, inclusivo: boolean) =>
      tasks.filter(t => {
        if (t.status !== 'completed' || !t.completedAt) return false;
        const quando = new Date(t.completedAt);
        return quando >= de && (inclusivo ? quando <= ate : quando < ate);
      }).length;

    const thisWeekCompleted = semana?.estaSemana ?? contarLocal(thisWeekStart, now, true);
    const lastWeekCompleted =
      semana?.semanaPassada ?? contarLocal(lastWeekStart, thisWeekStart, false);

    /*
     * Sem base de comparação a variação é 0, e não 100%.
     *
     * Quem está na primeira semana de uso não "melhorou 100%" — não tem com o
     * que comparar. Antes esta era a resposta padrão, porque a semana passada
     * já tinha sido apagada e a base era sempre zero.
     */
    const weekComparisonPercent =
      lastWeekCompleted > 0
        ? Math.round(((thisWeekCompleted - lastWeekCompleted) / lastWeekCompleted) * 100)
        : 0;

    // Variação semana-a-semana por métrica, usando a data relevante de cada uma.
    const inThisWeek = (d: Date) => d >= thisWeekStart && d <= now;
    const inLastWeek = (d: Date) => d >= lastWeekStart && d < thisWeekStart;

    const createdThis = tasks.filter(t => inThisWeek(new Date(t.createdAt))).length;
    const createdLast = tasks.filter(t => inLastWeek(new Date(t.createdAt))).length;

    const ip = tasks.filter(t => t.status === 'in_progress');
    const ipThis = ip.filter(t => inThisWeek(new Date(t.createdAt))).length;
    const ipLast = ip.filter(t => inLastWeek(new Date(t.createdAt))).length;

    /*
     * `dueDate` é 'AAAA-MM-DD' e precisa ser lido no fuso LOCAL.
     *
     * `new Date('2026-08-23')` é meia-noite UTC — que no Brasil é 21h do dia
     * 22. Uma tarefa com prazo no domingo caía na semana anterior, e a
     * comparação de atrasadas errava justo na borda.
     */
    const diaLocal = (iso: string) => {
      const [a, m, d] = iso.split('-').map(Number);
      return new Date(a, (m ?? 1) - 1, d ?? 1);
    };
    const od = tasks.filter(t => t.status === 'overdue' && t.dueDate);
    const odThis = od.filter(t => inThisWeek(diaLocal(t.dueDate as string))).length;
    const odLast = od.filter(t => inLastWeek(diaLocal(t.dueDate as string))).length;

    const comparisons = {
      total: weekChange(createdThis, createdLast, true),
      completed: weekChange(thisWeekCompleted, lastWeekCompleted, true),
      inProgress: weekChange(ipThis, ipLast, true),
      overdue: weekChange(odThis, odLast, false), // menos atrasadas = bom
    };

    return {
      total,
      completed,
      inProgress,
      overdue,
      pending,
      completionRate,
      thisWeekCompleted,
      lastWeekCompleted,
      weekComparisonPercent,
      comparisons,
    };
  }, [tasks, semana?.estaSemana, semana?.semanaPassada]);
}
