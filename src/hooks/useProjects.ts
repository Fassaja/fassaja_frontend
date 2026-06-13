import { useState, useEffect, useCallback } from 'react';
import { Project } from '@/types/project';
import { projectsService } from '@/services/projectsService';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await projectsService.getProjects();
      setProjects(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

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
        setProjects(prev => prev.map(p => p.id === id ? updated : p));
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

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    refresh: loadProjects,
  };
}
