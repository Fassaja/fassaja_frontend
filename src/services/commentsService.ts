import { api } from './api';

export interface TaskComment {
  id: string;
  body: string;
  createdAt: string;
  /** Preenchido só quando o texto mudou depois de publicado. */
  editedAt: string | null;
  author: { id: string; name: string };
  /** Vem do servidor: a tela não precisa reimplementar a regra de permissão. */
  canEdit: boolean;
  canDelete: boolean;
}

export const commentsService = {
  list: (taskId: string) => api.get<TaskComment[]>(`/tasks/${taskId}/comments`),
  create: (taskId: string, body: string) =>
    api.post<TaskComment>(`/tasks/${taskId}/comments`, { body }),
  update: (taskId: string, commentId: string, body: string) =>
    api.patch<TaskComment>(`/tasks/${taskId}/comments/${commentId}`, { body }),
  remove: (taskId: string, commentId: string) =>
    api.delete<void>(`/tasks/${taskId}/comments/${commentId}`),
};
