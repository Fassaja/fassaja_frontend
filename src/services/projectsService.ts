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

  async deleteProject(id: string): Promise<boolean> {
    await api.delete<void>(`/projects/${id}`);
    return true;
  },
};
