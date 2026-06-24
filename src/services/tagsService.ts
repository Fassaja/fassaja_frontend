import { Tag } from '@/types/tag';
import { api } from './api';

export const tagsService = {
  async getTags(): Promise<Tag[]> {
    return api.get<Tag[]>('/tags');
  },

  async createTag(input: { name: string; color: string }): Promise<Tag> {
    return api.post<Tag>('/tags', input);
  },

  async updateTag(id: string, updates: Partial<{ name: string; color: string }>): Promise<Tag> {
    return api.patch<Tag>(`/tags/${id}`, updates);
  },

  async deleteTag(id: string): Promise<boolean> {
    await api.delete<void>(`/tags/${id}`);
    return true;
  },
};
