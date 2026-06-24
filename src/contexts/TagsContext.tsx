import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Tag } from '@/types/tag';
import { tagsService } from '@/services/tagsService';
import { useAuth } from './AuthContext';

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
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadTags = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      // Tags são um recurso de conta — visitante não tem (igual a projetos).
      const data = isGuest ? [] : await tagsService.getTags();
      setTags(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [isGuest]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const refresh = useCallback(() => loadTags(true), [loadTags]);

  const createTag = useCallback(async (input: { name: string; color: string }) => {
    if (isGuest) {
      throw new Error('Entre na sua conta para criar tags.');
    }
    try {
      const created = await tagsService.createTag(input);
      // Mantém a lista ordenada por nome, como o backend devolve.
      setTags(prev =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      return created;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [isGuest]);

  return (
    <TagsContext.Provider value={{ tags, loading, error, createTag, refresh }}>
      {children}
    </TagsContext.Provider>
  );
};
