import { useState, useEffect, useCallback } from 'react';
import { Task } from '@/types/task';
import { tasksService } from '@/services/tasksService';
import { useCelebration } from '@/contexts/CelebrationContext';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { isToday } from '@/utils/date';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { celebrate } = useCelebration();
  const { user, recordProductiveDay } = useUser();
  const { isGuest, noteGuestTask } = useAuth();

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await tasksService.getTasks();
      setTasks(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const createTask = useCallback(async (task: Omit<Task, 'id' | 'createdAt'>) => {
    try {
      const newTask = await tasksService.createTask(task);
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
      const updated = await tasksService.updateTask(id, updates);
      if (updated) {
        setTasks(prev => prev.map(t => t.id === id ? updated : t));
      }
      return updated;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  const completeTask = useCallback(async (id: string) => {
    try {
      const wasCompleted = tasks.find(t => t.id === id)?.status === 'completed';
      const updated = await tasksService.completeTask(id);
      if (updated) {
        setTasks(prev => prev.map(t => t.id === id ? updated : t));
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
  }, [tasks, celebrate, recordProductiveDay, user.dailyGoal]);

  const deleteTask = useCallback(async (id: string) => {
    try {
      await tasksService.deleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
    refresh: loadTasks,
  };
}
