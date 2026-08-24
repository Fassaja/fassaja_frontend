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

  /** Define o conjunto FINAL de responsáveis. Lista vazia remove todos. */
  /**
   * `teamId` só é necessário para delegar tarefa que NÃO está em projeto de
   * equipe — nesse caso não há de onde deduzir o time. Com projeto, o servidor
   * ignora o que vier aqui: a fonte é o projeto.
   */
  async assignTask(id: string, assigneeIds: string[], teamId?: string): Promise<Task> {
    return api.patch<Task>(`/tasks/${id}/assign`, { assigneeIds, teamId });
  },


  // --- Passos (checklist) ---------------------------------------------------
  // Todas devolvem a TAREFA inteira já atualizada: o front troca o objeto e não
  // precisa costurar a lista de passos na mão.

  async addSubtask(taskId: string, title: string): Promise<Task> {
    return api.post<Task>(`/tasks/${taskId}/subtasks`, { title });
  },

  async updateSubtask(
    taskId: string,
    subtaskId: string,
    updates: { title?: string; done?: boolean },
  ): Promise<Task> {
    return api.patch<Task>(`/tasks/${taskId}/subtasks/${subtaskId}`, updates);
  },

  async removeSubtask(taskId: string, subtaskId: string): Promise<Task> {
    return api.delete<Task>(`/tasks/${taskId}/subtasks/${subtaskId}`);
  },

  async reorderSubtasks(taskId: string, ids: string[]): Promise<Task> {
    return api.patch<Task>(`/tasks/${taskId}/subtasks/reorder`, { ids });
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
