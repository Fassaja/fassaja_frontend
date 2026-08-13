import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Idea, IdeaInput, ConvertIdeaInput } from '@/types/idea';
import { ideasService } from '@/services/ideasService';
import { useAuth } from './AuthContext';

interface IdeasContextValue {
  ideas: Idea[];
  loading: boolean;
  error: Error | null;
  createIdea: (input: IdeaInput) => Promise<Idea>;
  updateIdea: (id: string, input: Partial<IdeaInput>) => Promise<Idea>;
  deleteIdea: (id: string) => Promise<void>;
  convertIdea: (id: string, input?: ConvertIdeaInput) => Promise<string>;
  refresh: () => Promise<void>;
}

const IdeasContext = createContext<IdeasContextValue>({} as IdeasContextValue);

export const useIdeas = () => useContext(IdeasContext);

export const IdeasProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isGuest } = useAuth();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      // Ideias exigem conta (a rota é autenticada): visitante não chama a API.
      const data = isGuest ? [] : await ideasService.list();
      setIdeas(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [isGuest]);

  useEffect(() => {
    load();
  }, [load]);

  const createIdea = useCallback(async (input: IdeaInput) => {
    const created = await ideasService.create(input);
    setIdeas(prev => [created, ...prev]);
    return created;
  }, []);

  const updateIdea = useCallback(async (id: string, input: Partial<IdeaInput>) => {
    const updated = await ideasService.update(id, input);
    setIdeas(prev => prev.map(i => (i.id === id ? updated : i)));
    return updated;
  }, []);

  const deleteIdea = useCallback(async (id: string) => {
    await ideasService.remove(id);
    setIdeas(prev => prev.filter(i => i.id !== id));
  }, []);

  /**
   * Converte e devolve o id do projeto criado (a página usa para levar a
   * pessoa até ele). A ideia continua na lista, agora como `convertida` — é o
   * registro de onde o projeto veio.
   */
  const convertIdea = useCallback(async (id: string, input: ConvertIdeaInput = {}) => {
    const { idea, projectId } = await ideasService.convert(id, input);
    setIdeas(prev => prev.map(i => (i.id === id ? idea : i)));
    return projectId;
  }, []);

  return (
    <IdeasContext.Provider
      value={{
        ideas,
        loading,
        error,
        createIdea,
        updateIdea,
        deleteIdea,
        convertIdea,
        refresh: () => load(true),
      }}
    >
      {children}
    </IdeasContext.Provider>
  );
};
