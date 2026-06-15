export interface Project {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdAt: string;
  type?: 'solo' | 'team';
  teamId?: string;
  teamName?: string;
}
