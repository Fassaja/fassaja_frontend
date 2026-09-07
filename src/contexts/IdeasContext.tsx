import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Idea, IdeaInput, ConvertIdeaInput } from '@/types/idea';
import { ideasService } from '@/services/ideasService';
import { useAuth } from './AuthContext';
import { useSessao } from '@/hooks/useSessao';

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
  const { identidade, carregar, marcar } = useSessao();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(
    (silent = false) => {
      if (!silent) setLoading(true);
      return carregar({
        // Ideias exigem conta (a rota é autenticada): visitante não chama a API.
        buscar: async () => (isGuest ? [] : await ideasService.list()),
        aoReceber: data => {
          setIdeas(data);
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

  // Por identidade, não por `isGuest`: ver ProjectsContext (FE-01).
  useEffect(() => {
    setIdeas([]);
    setError(null);
    load();
  }, [identidade, load]);

  const createIdea = useCallback(
    async (input: IdeaInput) => {
      const aplicar = marcar();
      const created = await ideasService.create(input);
      aplicar(() => setIdeas(prev => [created, ...prev]));
      return created;
    },
    [marcar],
  );

  const updateIdea = useCallback(
    async (id: string, input: Partial<IdeaInput>) => {
      const aplicar = marcar();
      const updated = await ideasService.update(id, input);
      aplicar(() => setIdeas(prev => prev.map(i => (i.id === id ? updated : i))));
      return updated;
    },
    [marcar],
  );

  const deleteIdea = useCallback(
    async (id: string) => {
      const aplicar = marcar();
      await ideasService.remove(id);
      aplicar(() => setIdeas(prev => prev.filter(i => i.id !== id)));
    },
    [marcar],
  );

  /**
   * Converte e devolve o id do projeto criado (a página usa para levar a
   * pessoa até ele). A ideia continua na lista, agora como `convertida` — é o
   * registro de onde o projeto veio.
   */
  const convertIdea = useCallback(
    async (id: string, input: ConvertIdeaInput = {}) => {
      const aplicar = marcar();
      const { idea, projectId } = await ideasService.convert(id, input);
      aplicar(() => setIdeas(prev => prev.map(i => (i.id === id ? idea : i))));
      return projectId;
    },
    [marcar],
  );

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
