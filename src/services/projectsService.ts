import { Project } from '@/types/project';
import { api } from './api';

export const projectsService = {
  async getProjects(): Promise<Project[]> {
    return api.get<Project[]>('/projects');
  },

  async getProjectById(id: string): Promise<Project | undefined> {
    return api.get<Project>(`/projects/${id}`);
  },

  async createProject(project: Omit<Project, 'id' | 'createdAt'>): Promise<Project> {
    return api.post<Project>('/projects', project);
  },

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    return api.patch<Project>(`/projects/${id}`, updates);
  },

  /**
   * Conclui ou reabre o projeto. Envia um booleano — a data é decidida pelo
   * servidor, então `completedAt` nunca sobe do cliente.
   */
  async setCompleted(id: string, completed: boolean): Promise<Project | undefined> {
    return api.patch<Project>(`/projects/${id}`, { completed });
  },

  /**
   * Total de projetos já concluídos (contador vitalício no servidor).
   *
   * Vem da API porque não dá para contar na tela: projetos concluídos somem da
   * lista depois de alguns dias, e as tarefas que os compunham são apagadas
   * antes disso.
   */
  async getStats(): Promise<{ completedProjects: number }> {
    return api.get<{ completedProjects: number }>('/projects/stats');
  },

  async deleteProject(id: string): Promise<boolean> {
    await api.delete<void>(`/projects/${id}`);
    return true;
  },
};
