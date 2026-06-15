import { api } from './api';
import { TeamSummary, TeamMember } from '@/types/team';

export const teamsService = {
  // O usuário atual vem do token (Authorization header), não da query.
  listTeams(): Promise<TeamSummary[]> {
    return api.get<TeamSummary[]>('/teams');
  },

  createTeam(name: string): Promise<TeamSummary> {
    return api.post<TeamSummary>('/teams', { name });
  },

  getMembers(teamId: string): Promise<TeamMember[]> {
    return api.get<TeamMember[]>(`/teams/${teamId}/members`);
  },

  async removeMember(teamId: string, userId: string): Promise<void> {
    await api.delete<void>(`/teams/${teamId}/members/${userId}`);
  },
};
