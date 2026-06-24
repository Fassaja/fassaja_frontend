import { Message } from '@/types/message';
import { api } from './api';

interface ListParams {
  since?: string; // ISO: só mensagens mais novas que isto (polling incremental)
  before?: string; // ISO: página anterior (carregar mais antigas)
  limit?: number;
}

export const messagesService = {
  async list(teamId: string, params: ListParams = {}): Promise<Message[]> {
    const q = new URLSearchParams();
    if (params.since) q.set('since', params.since);
    if (params.before) q.set('before', params.before);
    if (params.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return api.get<Message[]>(`/teams/${teamId}/messages${qs ? `?${qs}` : ''}`);
  },

  async send(teamId: string, content: string): Promise<Message> {
    return api.post<Message>(`/teams/${teamId}/messages`, { content });
  },
};
