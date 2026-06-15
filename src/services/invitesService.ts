import { api } from './api';
import { InviteState, PendingRequest } from '@/types/team';

// O usuário atual vem do token (Authorization header), não do body/query.
export const invitesService = {
  createInvite(teamId: string): Promise<{ token: string }> {
    return api.post<{ token: string }>(`/teams/${teamId}/invites`, {});
  },

  getInviteState(token: string): Promise<InviteState> {
    return api.get<InviteState>(`/invites/${token}`);
  },

  requestJoin(token: string): Promise<{ status: 'pending' }> {
    return api.post<{ status: 'pending' }>(`/invites/${token}/requests`, {});
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
