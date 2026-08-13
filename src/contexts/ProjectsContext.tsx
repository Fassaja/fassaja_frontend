import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Project } from '@/types/project';
import { projectsService } from '@/services/projectsService';
import { useAuth } from './AuthContext';

interface ProjectsContextValue {
  projects: Project[];
  loading: boolean;
  error: Error | null;
  createProject: (project: Omit<Project, 'id' | 'createdAt'>) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project | undefined>;
  setProjectCompleted: (id: string, completed: boolean) => Promise<Project | undefined>;
  deleteProject: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const ProjectsContext = createContext<ProjectsContextValue>({} as ProjectsContextValue);

/** Mantém a mesma API de antes — as páginas não mudam. */
export const useProjects = () => useContext(ProjectsContext);

export const ProjectsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isGuest } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadProjects = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      // Visitante não tem projetos (área bloqueada): não chama a API.
      const data = isGuest ? [] : await projectsService.getProjects();
      setProjects(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [isGuest]);

  // Recarrega ao montar e ao trocar entre visitante/autenticado (login/logout).
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const refresh = useCallback(() => loadProjects(true), [loadProjects]);

  const createProject = useCallback(async (project: Omit<Project, 'id' | 'createdAt'>) => {
    try {
      const newProject = await projectsService.createProject(project);
      setProjects(prev => [...prev, newProject]);
      return newProject;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    try {
      const updated = await projectsService.updateProject(id, updates);
      if (updated) {
        setProjects(prev => prev.map(p => (p.id === id ? updated : p)));
      }
      return updated;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  // Concluir/reabrir passa por rota própria (envia `completed`, não a data) e
  // não pelo updateProject, que carrega os campos editáveis do formulário.
  const setProjectCompleted = useCallback(async (id: string, completed: boolean) => {
    try {
      const updated = await projectsService.setCompleted(id, completed);
      if (updated) {
        setProjects(prev => prev.map(p => (p.id === id ? updated : p)));
      }
      return updated;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    try {
      await projectsService.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        loading,
        error,
        createProject,
        updateProject,
        setProjectCompleted,
        deleteProject,
        refresh,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
};
