import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarClock, CheckCircle2 } from 'lucide-react';
import { Task } from '@/types/task';
import { tasksService } from '@/services/tasksService';
import { formatDate, isToday } from '@/utils/date';

export interface NotificationItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  detail: string;
  tone: string;
}

export function useNotifications(active: boolean) {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (active) tasksService.getTasks().then(setTasks);
  }, [active]);

  const items = useMemo<NotificationItem[]>(() => {
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

    return [...overdue, ...today, ...doneToday];
  }, [tasks]);

  return items;
}
