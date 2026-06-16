import { api } from './api';
import { TeamSummary, TeamMember, TeamProjectSummary } from '@/types/team';

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

  getProjects(teamId: string): Promise<TeamProjectSummary[]> {
    return api.get<TeamProjectSummary[]>(`/teams/${teamId}/projects`);
  },

  async setMemberTitle(teamId: string, userId: string, title: string): Promise<void> {
    await api.patch<void>(`/teams/${teamId}/members/${userId}`, { title });
  },

  async removeMember(teamId: string, userId: string): Promise<void> {
    await api.delete<void>(`/teams/${teamId}/members/${userId}`);
  },
};
