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

export function useDashboardStats(tasks: Task[]): DashboardStats {
  return useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);

    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const overdue = tasks.filter(t => t.status === 'overdue').length;
    const pending = tasks.filter(t => t.status === 'pending').length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const thisWeekCompleted = tasks.filter(t => {
      if (t.status !== 'completed' || !t.completedAt) return false;
      const completedDate = new Date(t.completedAt);
      return completedDate >= thisWeekStart && completedDate <= now;
    }).length;

    const lastWeekCompleted = tasks.filter(t => {
      if (t.status !== 'completed' || !t.completedAt) return false;
      const completedDate = new Date(t.completedAt);
      return completedDate >= lastWeekStart && completedDate < thisWeekStart;
    }).length;

    const weekComparisonPercent = lastWeekCompleted > 0
      ? Math.round(((thisWeekCompleted - lastWeekCompleted) / lastWeekCompleted) * 100)
      : thisWeekCompleted > 0 ? 100 : 0;

    // Variação semana-a-semana por métrica, usando a data relevante de cada uma.
    const inThisWeek = (d: Date) => d >= thisWeekStart && d <= now;
    const inLastWeek = (d: Date) => d >= lastWeekStart && d < thisWeekStart;

    const createdThis = tasks.filter(t => inThisWeek(new Date(t.createdAt))).length;
    const createdLast = tasks.filter(t => inLastWeek(new Date(t.createdAt))).length;

    const ip = tasks.filter(t => t.status === 'in_progress');
    const ipThis = ip.filter(t => inThisWeek(new Date(t.createdAt))).length;
    const ipLast = ip.filter(t => inLastWeek(new Date(t.createdAt))).length;

    const od = tasks.filter(t => t.status === 'overdue' && t.dueDate);
    const odThis = od.filter(t => inThisWeek(new Date(t.dueDate as string))).length;
    const odLast = od.filter(t => inLastWeek(new Date(t.dueDate as string))).length;

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
  }, [tasks]);
}
