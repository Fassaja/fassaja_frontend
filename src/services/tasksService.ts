import { Task } from '@/types/task';
import { api } from './api';

export const tasksService = {
  async getTasks(): Promise<Task[]> {
    return api.get<Task[]>('/tasks');
  },

  async getTaskById(id: string): Promise<Task | undefined> {
    return api.get<Task>(`/tasks/${id}`);
  },

  async createTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
    return api.post<Task>('/tasks', task);
  },

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined> {
    return api.patch<Task>(`/tasks/${id}`, updates);
  },

  async deleteTask(id: string): Promise<boolean> {
    await api.delete<void>(`/tasks/${id}`);
    return true;
  },

  async completeTask(id: string): Promise<Task | undefined> {
    return api.patch<Task>(`/tasks/${id}/complete`, {});
  },

  async getTasksByProject(projectId: string): Promise<Task[]> {
    const tasks = await api.get<Task[]>('/tasks');
    return tasks.filter(task => task.projectId === projectId);
  },

  async getTasksByStatus(status: Task['status']): Promise<Task[]> {
    const tasks = await api.get<Task[]>('/tasks');
    return tasks.filter(task => task.status === status);
  },
};
