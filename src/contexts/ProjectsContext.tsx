import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Project } from '@/types/project';
import { projectsService } from '@/services/projectsService';
import { useAuth } from './AuthContext';
import { useSessao } from '@/hooks/useSessao';

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
  // Identidade da sessão: é ela que diz de quem é cada resposta (FE-01).
  const { identidade, carregar, marcar } = useSessao();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadProjects = useCallback(
    (silent = false) => {
      if (!silent) setLoading(true);
      return carregar({
        // Visitante não tem projetos (área bloqueada): não chama a API.
        buscar: async () => (isGuest ? [] : await projectsService.getProjects()),
        aoReceber: data => {
          setProjects(data);
          setError(null);
        },
        aoFalhar: err => setError(err),
        aoTerminar: () => {
          if (!silent) setLoading(false);
        },
      });
    },
    [isGuest, carregar],
  );

  /*
   * Recarrega a cada troca de IDENTIDADE — login, logout, troca de conta,
   * sessão nova na mesma conta.
   *
   * A dependência era só `isGuest`. Sair da conta A e entrar na B não muda esse
   * booleano: o efeito não rodava, e a lista de A continuava na tela da B. A
   * limpeza vem antes da carga porque nenhuma resposta é necessária para o
   * dado da conta anterior sumir.
   */
  useEffect(() => {
    setProjects([]);
    setError(null);
    loadProjects();
  }, [identidade, loadProjects]);

  const refresh = useCallback(() => loadProjects(true), [loadProjects]);

  const createProject = useCallback(
    async (project: Omit<Project, 'id' | 'createdAt'>) => {
      // Resposta de mutação também é dado de conta: chegando depois da saída,
      // ela inseriria um projeto de A na tela de B.
      const aplicar = marcar();
      try {
        const newProject = await projectsService.createProject(project);
        aplicar(() => setProjects(prev => [...prev, newProject]));
        return newProject;
      } catch (err) {
        aplicar(() => setError(err as Error));
        throw err;
      }
    },
    [marcar],
  );

  const updateProject = useCallback(
    async (id: string, updates: Partial<Project>) => {
      const aplicar = marcar();
      try {
        const updated = await projectsService.updateProject(id, updates);
        if (updated) {
          aplicar(() => setProjects(prev => prev.map(p => (p.id === id ? updated : p))));
        }
        return updated;
      } catch (err) {
        aplicar(() => setError(err as Error));
        throw err;
      }
    },
    [marcar],
  );

  // Concluir/reabrir passa por rota própria (envia `completed`, não a data) e
  // não pelo updateProject, que carrega os campos editáveis do formulário.
  const setProjectCompleted = useCallback(
    async (id: string, completed: boolean) => {
      const aplicar = marcar();
      try {
        const updated = await projectsService.setCompleted(id, completed);
        if (updated) {
          aplicar(() => setProjects(prev => prev.map(p => (p.id === id ? updated : p))));
        }
        return updated;
      } catch (err) {
        aplicar(() => setError(err as Error));
        throw err;
      }
    },
    [marcar],
  );

  const deleteProject = useCallback(
    async (id: string) => {
      const aplicar = marcar();
      try {
        await projectsService.deleteProject(id);
        aplicar(() => setProjects(prev => prev.filter(p => p.id !== id)));
      } catch (err) {
        aplicar(() => setError(err as Error));
        throw err;
      }
    },
    [marcar],
  );

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
