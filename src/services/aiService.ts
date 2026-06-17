import { api } from './api';

export type DraftPriority = 'low' | 'medium' | 'high';

export interface DraftCardPayload {
  title: string;
  description?: string;
  priority: DraftPriority;
}

/** Rascunho devolvido por /ai/draft (sem ids — são editáveis no front). */
export interface DraftResponse {
  name: string;
  color: string;
  description: string;
  cards: DraftCardPayload[];
  /** 'ai' = veio do Claude; 'demo' = rascunho fake. */
  generatedBy: 'ai' | 'demo';
}

/** Corpo enviado a /ai/apply (rascunho aprovado pelo usuário). */
export interface ApplyDraftPayload {
  name: string;
  color: string;
  description?: string;
  type?: 'solo' | 'team';
  cards: DraftCardPayload[];
}

export interface ApplyResult {
  project: { id: string; name: string };
  createdCount: number;
}

export const aiService = {
  /** Diz se a IA real está ativa (há chave) ou se está em modo demonstração. */
  async status(): Promise<{ aiEnabled: boolean }> {
    return api.get<{ aiEnabled: boolean }>('/ai/status');
  },

  /** Pede à IA um rascunho de projeto + cards a partir do documento. */
  async draft(documentText: string, command?: string): Promise<DraftResponse> {
    return api.post<DraftResponse>('/ai/draft', { documentText, command });
  },

  /** Cria de verdade o projeto e os cards aprovados. */
  async apply(payload: ApplyDraftPayload): Promise<ApplyResult> {
    return api.post<ApplyResult>('/ai/apply', payload);
  },
};
