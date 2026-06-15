import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Task } from '@/types/task';
import { tasksService } from '@/services/tasksService';
import { guestTasksStore } from '@/services/guestTasksStore';
import { useCelebration } from './CelebrationContext';
import { useUser } from './UserContext';
import { useAuth } from './AuthContext';
import { isToday } from '@/utils/date';

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
  const [tasks, setTasks] = useState<Task[]>([]);
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
      setTasks(data);
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
      setTasks(prev => [...prev, newTask]);
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
        setTasks(prev => prev.map(t => (t.id === id ? updated : t)));
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
        setTasks(prev => prev.map(t => (t.id === id ? updated : t)));
        if (!wasCompleted) {
          recordProductiveDay();
          const doneTodayBefore = tasks.filter(
            t => t.status === 'completed' && t.completedAt && isToday(t.completedAt),
          ).length;
          const goal = user.dailyGoal;
          const justHitGoal =
            goal > 0 && doneTodayBefore < goal && doneTodayBefore + 1 >= goal;
          if (justHitGoal) {
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
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [isGuest]);

  const assignTask = useCallback(
    async (id: string, assigneeId: string | null) => {
      const updated = await tasksService.assignTask(id, assigneeId);
      setTasks(prev => prev.map(t => (t.id === id ? updated : t)));
      return updated;
    },
    [],
  );

  const respondAssignment = useCallback(
    async (id: string, action: 'accept' | 'reject') => {
      const updated = await tasksService.respondAssignment(id, action);
      setTasks(prev => prev.map(t => (t.id === id ? updated : t)));
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
