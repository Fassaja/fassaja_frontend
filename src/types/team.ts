export interface TeamSummary {
  id: string;
  name: string;
  color: string; // cor de identidade da equipe
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
  title?: string | null; // cargo personalizado na equipe
  avatar?: string | null;
  muted?: boolean; // silenciado no chat da equipe
}

export interface TeamProjectSummary {
  id: string;
  name: string;
  color: string;
  taskCount: number;
  completedCount: number;
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
