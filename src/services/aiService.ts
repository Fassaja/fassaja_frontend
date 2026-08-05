import { api } from './api';

export type DraftPriority = 'low' | 'medium' | 'high';
export type DraftMode = 'structure' | 'improve';

export interface DraftCardPayload {
  title: string;
  description?: string;
  priority: DraftPriority;
  /** 'YYYY-MM-DD' — prazo sugerido pela IA (pode não vir). */
  dueDate?: string;
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

export const aiService = {
  /** Status da IA: ativa? e quantos usos restam nesta semana. */
  async status(): Promise<AiStatus> {
    return api.get<AiStatus>('/ai/status');
  },

  /** Pede à IA um rascunho de projeto + cards a partir do documento. */
  async draft(documentText: string, command?: string, mode?: DraftMode): Promise<DraftResponse> {
    // 'en-CA' devolve YYYY-MM-DD no fuso do navegador — a IA usa como referência
    // para calcular os prazos ("até sexta", "em 2 semanas"...).
    const today = new Date().toLocaleDateString('en-CA');
    return api.post<DraftResponse>('/ai/draft', { documentText, command, mode, today });
  },

  /** Cria de verdade o projeto e os cards aprovados. */
  async apply(payload: ApplyDraftPayload): Promise<ApplyResult> {
    return api.post<ApplyResult>('/ai/apply', payload);
  },
};
