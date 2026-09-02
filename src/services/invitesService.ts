import { api } from './api';
import { InviteState, PendingRequest } from '@/types/team';

// O usuário atual vem do token (Authorization header), não do body/query.
export const invitesService = {
  createInvite(teamId: string): Promise<{ token: string }> {
    return api.post<{ token: string }>(`/teams/${teamId}/invites`, {});
  },

  async revokeInvites(teamId: string): Promise<void> {
    await api.delete<void>(`/teams/${teamId}/invites`);
  },

  getInviteState(token: string): Promise<InviteState> {
    return api.get<InviteState>(`/invites/${token}`);
  },

  requestJoin(token: string): Promise<{ status: 'pending' }> {
    return api.post<{ status: 'pending' }>(`/invites/${token}/requests`, {});
  },

  /** Convida um endereço de e-mail. O convite é nominal e entra direto. */
  async inviteByEmail(teamId: string, email: string): Promise<void> {
    await api.post<{ sent: true }>(`/teams/${teamId}/invites/email`, { email });
  },

  /** Aceita um convite nominal (link público usa requestJoin). */
  async accept(token: string): Promise<void> {
    await api.post<{ status: 'joined' }>(`/invites/${token}/accept`, {});
  },

  listRequests(teamId: string): Promise<PendingRequest[]> {
    return api.get<PendingRequest[]>(`/teams/${teamId}/requests`);
  },

  decide(
    requestId: string,
    action: 'approve' | 'reject',
  ): Promise<{ status: 'approved' | 'rejected' }> {
    return api.patch<{ status: 'approved' | 'rejected' }>(`/requests/${requestId}`, {
      action,
    });
  },
};
