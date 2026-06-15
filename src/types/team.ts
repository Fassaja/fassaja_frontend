export interface TeamSummary {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  role: string; // owner | member
  memberCount: number;
}

export interface TeamMember {
  userId: string;
  name: string;
  email: string;
  role: string; // owner | member
}

export interface InviteState {
  valid: boolean;
  team: { id: string; name: string } | null;
  alreadyMember: boolean;
  myRequestStatus: 'pending' | 'approved' | 'rejected' | null;
}

export interface PendingRequest {
  id: string;
  userId: string;
  name: string;
  email: string;
  createdAt: string;
}
