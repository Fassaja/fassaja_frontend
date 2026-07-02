import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Task } from '@/types/task';
import { tasksService } from '@/services/tasksService';
import { guestTasksStore } from '@/services/guestTasksStore';
import { useCelebration } from './CelebrationContext';
import { useUser, computeStreak } from './UserContext';
import { useAuth } from './AuthContext';
import { isToday, isOverdue, todayISO, toISODate } from '@/utils/date';
import { detectMilestone } from '@/utils/milestones';

// Deriva "atrasada" no fuso LOCAL do usuário (o backend devolve o status real).
// Fonte única da verdade: toda tarefa exposta pelo contexto passa por aqui.
function deriveStatus(task: Task): Task {
  if (task.status !== 'completed' && task.dueDate && isOverdue(task.dueDate)) {
    return { ...task, status: 'overdue' };
  }
  return task;
}

interface TasksContextValue {
  tasks: Task[];
  loading: boolean;
  error: Error | null;
  createTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task | undefined>;
  completeTask: (id: string) => Promise<Task | undefined>;
  deleteTask: (id: string) => Promise<void>;
  assignTask: (id: string, assigneeId: string | null) => Promise<Task>;
  respondAssignment: (id: string, action: 'accept' | 'reject') => Promise<Task>;
  refresh: () => Promise<void>;
}

const TasksContext = createContext<TasksContextValue>({} as TasksContextValue);

/** Mantém a mesma API de antes — as páginas não mudam. */
export const useTasks = () => useContext(TasksContext);

export const TasksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  // Status "overdue" é calculado aqui (fuso local), não vem pronto do servidor.
  const tasks = useMemo(() => rawTasks.map(deriveStatus), [rawTasks]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { celebrate } = useCelebration();
  const { user, recordProductiveDay } = useUser();
  const { isGuest, noteGuestTask } = useAuth();

  const loadTasks = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      // Visitante: tarefas só do navegador (sandbox local). Autenticado: API.
      const data = isGuest ? guestTasksStore.getAll() : await tasksService.getTasks();
      setRawTasks(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [isGuest]);

  // Recarrega ao montar e sempre que troca entre visitante/autenticado (login/logout).
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Revalida sem sumir o conteúdo (mantém os dados atuais enquanto atualiza).
  const refresh = useCallback(() => loadTasks(true), [loadTasks]);

  const createTask = useCallback(async (task: Omit<Task, 'id' | 'createdAt'>) => {
    try {
      const newTask = isGuest
        ? guestTasksStore.create(task)
        : await tasksService.createTask(task);
      setRawTasks(prev => [...prev, newTask]);
      if (isGuest) noteGuestTask();
      return newTask;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [isGuest, noteGuestTask]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    try {
      const updated = isGuest
        ? guestTasksStore.update(id, updates)
        : await tasksService.updateTask(id, updates);
      if (updated) {
        setRawTasks(prev => prev.map(t => (t.id === id ? updated : t)));
      }
      return updated;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [isGuest]);

  const completeTask = useCallback(async (id: string) => {
    try {
      const wasCompleted = tasks.find(t => t.id === id)?.status === 'completed';
      const updated = isGuest
        ? guestTasksStore.complete(id)
        : await tasksService.completeTask(id);
      if (updated) {
        setRawTasks(prev => prev.map(t => (t.id === id ? updated : t)));
        if (!wasCompleted) {
          recordProductiveDay();
          const doneTodayBefore = tasks.filter(
            t => t.status === 'completed' && t.completedAt && isToday(t.completedAt),
          ).length;
          const goal = user.dailyGoal;
          const justHitGoal =
            goal > 0 && doneTodayBefore < goal && doneTodayBefore + 1 >= goal;

          // Marcos raros (projeto 100%, 7 dias de sequência, 10 na semana)
          // têm prioridade sobre a meta diária; senão, comemoração padrão.
          const nextTasks = tasks.map(t => (t.id === id ? updated : t));
          const days = new Set<string>(user.productiveDays);
          nextTasks.forEach(t => {
            if (t.status === 'completed' && t.completedAt) days.add(toISODate(new Date(t.completedAt)));
          });
          days.add(todayISO()); // a conclusão de agora torna hoje produtivo
          const streak = computeStreak(Array.from(days));

          const milestone = detectMilestone({ tasks: nextTasks, completedTask: updated, streak });
          if (milestone) {
            celebrate(milestone, 'goal');
          } else if (justHitGoal) {
            celebrate('Meta diária batida! 🎯', 'goal');
          } else {
            celebrate();
          }
        }
      }
      return updated;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [tasks, celebrate, recordProductiveDay, user.dailyGoal, isGuest]);

  const deleteTask = useCallback(async (id: string) => {
    try {
      if (isGuest) guestTasksStore.remove(id);
      else await tasksService.deleteTask(id);
      setRawTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [isGuest]);

  const assignTask = useCallback(
    async (id: string, assigneeId: string | null) => {
      const updated = await tasksService.assignTask(id, assigneeId);
      setRawTasks(prev => prev.map(t => (t.id === id ? updated : t)));
      return updated;
    },
    [],
  );

  const respondAssignment = useCallback(
    async (id: string, action: 'accept' | 'reject') => {
      const updated = await tasksService.respondAssignment(id, action);
      setRawTasks(prev => prev.map(t => (t.id === id ? updated : t)));
      return updated;
    },
    [],
  );

  return (
    <TasksContext.Provider
      value={{
        tasks,
        loading,
        error,
        createTask,
        updateTask,
        completeTask,
        deleteTask,
        assignTask,
        respondAssignment,
        refresh,
      }}
    >
      {children}
    </TasksContext.Provider>
  );
};
