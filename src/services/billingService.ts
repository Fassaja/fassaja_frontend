import { api } from './api';

/** Resposta de GET /billing/status — a única fonte de "sou Pro?". */
export interface ProStatus {
  pro: boolean;
  /** ISO da data até a qual o acesso está garantido; null sem assinatura. */
  until: string | null;
  /** Renova sozinha? false quando cancelada (ainda vale até `until`). */
  autoRenewing: boolean;
  provider: 'google_play' | 'mercado_pago' | string | null;
  /** Caminhos ligados no servidor. */
  lojas?: { googlePlay: boolean; mercadoPago: boolean };
}

// Assinatura do Pro. O app só entrega o COMPROVANTE (purchaseToken) da compra
// feita no Google Play; produto, estado e validade vêm do servidor, que
// pergunta ao Google. Nunca há um "sou Pro" decidido aqui.
export const billingService = {
  status: () => api.get<ProStatus>('/billing/status'),
  verifyGoogle: (purchaseToken: string) =>
    api.post<ProStatus>('/billing/google/verify', { purchaseToken }),
  /** Abre o checkout do Mercado Pago; devolve a URL para onde ir. */
  checkoutMercadoPago: () => api.post<{ url: string }>('/billing/mercado-pago/checkout', {}),
  /** Ao voltar do checkout: o webhook pode ainda não ter chegado. */
  syncMercadoPago: () => api.post<ProStatus>('/billing/mercado-pago/sync', {}),
  cancelMercadoPago: () => api.post<ProStatus>('/billing/mercado-pago/cancel', {}),
};
