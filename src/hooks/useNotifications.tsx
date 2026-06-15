import { useMemo } from 'react';
import { AlertCircle, CalendarClock, CheckCircle2, Send } from 'lucide-react';
import { useTasks } from '@/contexts/TasksContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, isToday } from '@/utils/date';

export interface NotificationItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  detail: string;
  tone: string;
}

// Lê do cache compartilhado de tarefas (sem buscar de novo a cada navegação).
export function useNotifications(_active?: boolean) {
  const { tasks } = useTasks();
  const { account } = useAuth();

  const items = useMemo<NotificationItem[]>(() => {
    // Propostas de tarefa pendentes para o usuário atual.
    const proposals = account
      ? tasks
          .filter(t => t.assigneeId === account.id && t.assignmentStatus === 'pending')
          .map(t => ({
            id: `p-${t.id}`,
            icon: <Send size={18} />,
            title: t.title,
            detail: 'Tarefa proposta a você',
            tone: '#FBBF24',
          }))
      : [];

    const overdue = tasks
      .filter(t => t.status === 'overdue')
      .map(t => ({
        id: `o-${t.id}`,
        icon: <AlertCircle size={18} />,
        title: t.title,
        detail: t.dueDate ? `Atrasada desde ${formatDate(t.dueDate)}` : 'Tarefa atrasada',
        tone: '#F43F5E',
      }));

    const today = tasks
      .filter(t => t.status !== 'completed' && t.dueDate && isToday(t.dueDate))
      .map(t => ({
        id: `t-${t.id}`,
        icon: <CalendarClock size={18} />,
        title: t.title,
        detail: 'Vence hoje',
        tone: '#2477FF',
      }));

    const doneToday = tasks
      .filter(t => t.status === 'completed' && t.completedAt && isToday(t.completedAt))
      .slice(0, 2)
      .map(t => ({
        id: `d-${t.id}`,
        icon: <CheckCircle2 size={18} />,
        title: t.title,
        detail: 'Concluída hoje',
        tone: '#22C55E',
      }));

    return [...proposals, ...overdue, ...today, ...doneToday];
  }, [tasks, account]);

  return items;
}
