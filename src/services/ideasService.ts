import { Idea, IdeaInput, ConvertIdeaInput } from '@/types/idea';
import { api } from './api';

// Ideias são pessoais: não existe ideia de equipe nesta versão, então nenhuma
// rota aqui recebe teamId — só a conversão, que cria um projeto.
export const ideasService = {
  list: () => api.get<Idea[]>('/ideas'),
  get: (id: string) => api.get<Idea>(`/ideas/${id}`),
  create: (input: IdeaInput) => api.post<Idea>('/ideas', input),
  update: (id: string, input: Partial<IdeaInput>) => api.patch<Idea>(`/ideas/${id}`, input),
  remove: (id: string) => api.delete<void>(`/ideas/${id}`),
  /** Cria o projeto e marca a ideia como convertida (transação no servidor). */
  convert: (id: string, input: ConvertIdeaInput = {}) =>
    api.post<{ idea: Idea; projectId: string }>(`/ideas/${id}/convert`, input),
};
