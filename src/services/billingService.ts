import { api } from './api';

/** Resposta de GET /billing/status — a única fonte de "sou Pro?". */
export interface ProStatus {
  pro: boolean;
  /** ISO da data até a qual o acesso está garantido; null sem assinatura. */
  until: string | null;
  /** Renova sozinha? false quando cancelada (ainda vale até `until`). */
  autoRenewing: boolean;
  provider: 'google_play' | string | null;
}

// Assinatura do Pro. O app só entrega o COMPROVANTE (purchaseToken) da compra
// feita no Google Play; produto, estado e validade vêm do servidor, que
// pergunta ao Google. Nunca há um "sou Pro" decidido aqui.
export const billingService = {
  status: () => api.get<ProStatus>('/billing/status'),
  verifyGoogle: (purchaseToken: string) =>
    api.post<ProStatus>('/billing/google/verify', { purchaseToken }),
};
