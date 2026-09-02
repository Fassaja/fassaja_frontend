/**
 * Papel na equipe, em ordem de poder. Espelha src/teams/team-roles.ts no
 * backend — e é ELE quem autoriza. O que existe aqui serve para a tela não
 * oferecer um botão que o servidor vai recusar; nunca para liberar nada.
 */
export type TeamRole = 'member' | 'manager' | 'admin' | 'owner';

/** Papéis que a interface pode conceder. Dono se transfere, não se concede. */
export type AssignableRole = 'member' | 'manager' | 'admin';

export interface TeamSummary {
  id: string;
  name: string;
  color: string; // cor de identidade da equipe
  ownerId: string;
  createdAt: string;
  role: TeamRole;
  memberCount: number;
}

export interface TeamMember {
  userId: string;
  name: string;
  email: string;
  role: TeamRole;
  /** Cargo escrito pela equipe ("Designer"). Rótulo — não dá permissão. */
  title?: string | null;
  avatar?: string | null;
  /** Projeção de `role` feita pelo servidor: gerente para cima. */
  canManageTasks?: boolean;
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

/**
 * Uma linha do histórico da equipe. `text` vem PRONTO do servidor: quem grava
 * o evento é quem sabe descrevê-lo, e assim uma versão antiga da tela não
 * transforma um evento novo em "ação desconhecida".
 */
export interface TeamActivityEntry {
  id: string;
  action: string;
  actorName: string;
  targetName: string | null;
  detail: string | null;
  createdAt: string;
  text: string;
}
