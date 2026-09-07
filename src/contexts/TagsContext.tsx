import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Tag } from '@/types/tag';
import { tagsService } from '@/services/tagsService';
import { useAuth } from './AuthContext';
import { useSessao } from '@/hooks/useSessao';

interface TagsContextValue {
  tags: Tag[];
  loading: boolean;
  error: Error | null;
  createTag: (input: { name: string; color: string }) => Promise<Tag>;
  refresh: () => Promise<void>;
}

const TagsContext = createContext<TagsContextValue>({} as TagsContextValue);

export const useTags = () => useContext(TagsContext);

export const TagsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isGuest } = useAuth();
  const { identidade, carregar, marcar } = useSessao();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadTags = useCallback(
    (silent = false) => {
      if (!silent) setLoading(true);
      return carregar({
        // Tags são um recurso de conta — visitante não tem (igual a projetos).
        buscar: async () => (isGuest ? [] : await tagsService.getTags()),
        aoReceber: data => {
          setTags(data);
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
    setTags([]);
    setError(null);
    loadTags();
  }, [identidade, loadTags]);

  const refresh = useCallback(() => loadTags(true), [loadTags]);

  const createTag = useCallback(async (input: { name: string; color: string }) => {
    if (isGuest) {
      throw new Error('Entre na sua conta para criar tags.');
    }
    const aplicar = marcar();
    try {
      const created = await tagsService.createTag(input);
      // Mantém a lista ordenada por nome, como o backend devolve.
      aplicar(() =>
        setTags(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name))),
      );
      return created;
    } catch (err) {
      aplicar(() => setError(err as Error));
      throw err;
    }
  }, [isGuest, marcar]);

  return (
    <TagsContext.Provider value={{ tags, loading, error, createTag, refresh }}>
      {children}
    </TagsContext.Provider>
  );
};
