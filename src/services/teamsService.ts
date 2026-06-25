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

  // Dono renomeia e/ou troca a cor da equipe.
  updateTeam(teamId: string, data: { name?: string; color?: string }): Promise<TeamSummary> {
    return api.patch<TeamSummary>(`/teams/${teamId}`, data);
  },

  async deleteTeam(teamId: string): Promise<void> {
    await api.delete<void>(`/teams/${teamId}`);
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

  async setMemberMute(teamId: string, userId: string, muted: boolean): Promise<void> {
    await api.patch<void>(`/teams/${teamId}/members/${userId}/mute`, { muted });
  },

  async removeMember(teamId: string, userId: string): Promise<void> {
    await api.delete<void>(`/teams/${teamId}/members/${userId}`);
  },
};
