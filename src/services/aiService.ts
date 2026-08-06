import { api } from './api';

export type DraftPriority = 'low' | 'medium' | 'high';
export type DraftMode = 'structure' | 'improve';

/** Tag do usuário sugerida pela IA (já resolvida para id/cor pelo back-end). */
export interface DraftTag {
  id: string;
  name: string;
  color: string;
}

export interface DraftCardPayload {
  title: string;
  description?: string;
  priority: DraftPriority;
  /** 'YYYY-MM-DD' — prazo sugerido pela IA (pode não vir). */
  dueDate?: string;
  /** Tags EXISTENTES do usuário que a IA considerou pertinentes. */
  tags?: DraftTag[];
}

/** Rascunho devolvido por /ai/draft (sem ids — são editáveis no front). */
export interface DraftResponse {
  name: string;
  color: string;
  description: string;
  cards: DraftCardPayload[];
  /** 'ai' = veio do Claude; 'demo' = rascunho fake. */
  generatedBy: 'ai' | 'demo';
  /**
   * Por que caiu no rascunho fake (só quando generatedBy === 'demo').
   * 'no-key'   = a IA não está configurada neste ambiente;
   * 'ai-error' = a chamada falhou — o uso não foi cobrado, dá pra tentar de novo.
   */
  demoReason?: 'no-key' | 'ai-error';
}

/** Um card no momento de criar (pode ter data e responsável). */
export interface ApplyCardPayload {
  title: string;
  description?: string;
  priority: DraftPriority;
  dueDate?: string;
  assigneeId?: string;
  /** Tags a aplicar. O back-end revalida que cada uma é do usuário. */
  tagIds?: string[];
}

/** Corpo enviado a /ai/apply (rascunho aprovado pelo usuário). */
export interface ApplyDraftPayload {
  // Se informado, adiciona os cards a este projeto existente.
  projectId?: string;
  // Usados ao criar um projeto novo:
  name?: string;
  color?: string;
  description?: string;
  teamId?: string;
  cards: ApplyCardPayload[];
}

export interface ApplyResult {
  project: { id: string; name: string };
  createdCount: number;
}

export interface AiStatus {
  aiEnabled: boolean;
  limit: number;
  used: number;
  remaining: number;
}

/** Origem comum às respostas do assistente. */
export interface AiOrigin {
  generatedBy: 'ai' | 'demo';
  demoReason?: 'no-key' | 'ai-error';
}

/**
 * Quantas tarefas entraram na análise e quantas existiam ao todo. Quando
 * `total > considered` o back-end recortou a lista e a tela precisa avisar.
 */
export interface Coverage {
  considered: number;
  total: number;
}

// --- Replanejar a semana -----------------------------------------------------

export interface ReplanChange {
  taskId: string;
  title: string;
  /** Prazo atual; ausente quando a tarefa não tinha data. */
  currentDueDate?: string;
  /** Novo prazo proposto ('YYYY-MM-DD'). */
  suggestedDueDate: string;
  reason: string;
}

export interface ReplanResult extends AiOrigin {
  summary: string;
  changes: ReplanChange[];
  coverage: Coverage;
}

// --- Distribuir entre a equipe ----------------------------------------------

export interface DistributeAssignment {
  taskId: string;
  title: string;
  assigneeId: string;
  assigneeName: string;
  reason: string;
}

export interface DistributeResult extends AiOrigin {
  summary: string;
  assignments: DistributeAssignment[];
  coverage: Coverage;
}

// --- Quebrar uma tarefa ------------------------------------------------------

export interface BreakdownCard {
  title: string;
  description: string;
  priority: DraftPriority;
  dueDate?: string;
  tags: DraftTag[];
}

export interface BreakdownResult extends AiOrigin {
  parent: { id: string; title: string; projectId?: string };
  cards: BreakdownCard[];
}

/** 'YYYY-MM-DD' no fuso do NAVEGADOR — o servidor roda em UTC e erraria "hoje". */
const localToday = () => new Date().toLocaleDateString('en-CA');

export const aiService = {
  /** Status da IA: ativa? e quantos usos restam nesta semana. */
  async status(): Promise<AiStatus> {
    return api.get<AiStatus>('/ai/status');
  },

  /** Pede à IA um rascunho de projeto + cards a partir do documento. */
  async draft(documentText: string, command?: string, mode?: DraftMode): Promise<DraftResponse> {
    // A IA usa a data local como referência para os prazos ("até sexta"...).
    return api.post<DraftResponse>('/ai/draft', {
      documentText,
      command,
      mode,
      today: localToday(),
    });
  },

  /** Cria de verdade o projeto e os cards aprovados. */
  async apply(payload: ApplyDraftPayload): Promise<ApplyResult> {
    return api.post<ApplyResult>('/ai/apply', payload);
  },

  /** Sugere novos prazos para as tarefas abertas. Nada é salvo. */
  async replan(input: { horizonDays?: number; projectId?: string; command?: string } = {}) {
    return api.post<ReplanResult>('/ai/replan', { ...input, today: localToday() });
  },

  /** Grava os prazos aprovados. */
  async applyReplan(changes: { taskId: string; dueDate: string }[]) {
    return api.post<{ updatedCount: number }>('/ai/replan/apply', { changes });
  },

  /** Sugere responsáveis para as tarefas sem dono de um projeto de equipe. */
  async distribute(projectId: string, command?: string) {
    return api.post<DistributeResult>('/ai/distribute', { projectId, command });
  },

  /** Efetiva as atribuições aprovadas. */
  async applyDistribute(assignments: { taskId: string; assigneeId: string }[]) {
    return api.post<{ assignedCount: number }>('/ai/distribute/apply', { assignments });
  },

  /** Sugere subtarefas para uma tarefa grande. Nada é salvo. */
  async breakdown(taskId: string, command?: string) {
    return api.post<BreakdownResult>('/ai/breakdown', { taskId, command, today: localToday() });
  },

  /** Cria as subtarefas aprovadas no mesmo projeto da tarefa original. */
  async applyBreakdown(taskId: string, cards: ApplyCardPayload[]) {
    return api.post<{ createdCount: number }>('/ai/breakdown/apply', { taskId, cards });
  },
};
