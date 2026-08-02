import { api } from './api';
import { TeamSummary, TeamMember, TeamProjectSummary } from '@/types/team';
import { Task } from '@/types/task';

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

  // Tarefas dos projetos da equipe (todos os membros veem).
  getTasks(teamId: string): Promise<Task[]> {
    return api.get<Task[]>(`/teams/${teamId}/tasks`);
  },

  async setMemberTitle(teamId: string, userId: string, title: string): Promise<void> {
    await api.patch<void>(`/teams/${teamId}/members/${userId}`, { title });
  },

  async setMemberPermissions(
    teamId: string,
    userId: string,
    canManageTasks: boolean,
  ): Promise<void> {
    await api.patch<void>(`/teams/${teamId}/members/${userId}/permissions`, { canManageTasks });
  },

  async removeMember(teamId: string, userId: string): Promise<void> {
    await api.delete<void>(`/teams/${teamId}/members/${userId}`);
  },

  /**
   * Dono passa a posse para outro membro e vira membro comum (mantendo a
   * permissão de gerenciar tarefas). É o caminho não-destrutivo para quem quer
   * deixar a equipe sem acabar com ela.
   */
  async transferOwnership(teamId: string, userId: string): Promise<void> {
    await api.patch<void>(`/teams/${teamId}/owner`, { userId });
  },

  /**
   * Sair da equipe. O que a pessoa criou lá continua com a equipe (a posse vai
   * para o dono); tarefas atribuídas a ela ficam sem responsável.
   * O dono precisa transferir a posse antes de poder sair.
   */
  async leaveTeam(teamId: string): Promise<void> {
    await api.post<void>(`/teams/${teamId}/leave`, {});
  },
};
