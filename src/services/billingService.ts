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
/** GET /billing/plano — público: o que está à venda e por onde. */
export interface Plano {
  precoBrl: number;
  lojas: { googlePlay: boolean; mercadoPago: boolean };
}

export const billingService = {
  plano: () => api.get<Plano>('/billing/plano'),
  status: () => api.get<ProStatus>('/billing/status'),
  verifyGoogle: (purchaseToken: string) =>
    api.post<ProStatus>('/billing/google/verify', { purchaseToken }),
  /** Abre o checkout do Mercado Pago; devolve a URL para onde ir. */
  checkoutMercadoPago: () => api.post<{ url: string }>('/billing/mercado-pago/checkout', {}),
  /** Ao voltar do checkout: a assinatura recém-criada vem em `preapprovalId`. */
  syncMercadoPago: (preapprovalId?: string) =>
    api.post<ProStatus>('/billing/mercado-pago/sync', { preapprovalId }),
  cancelMercadoPago: () => api.post<ProStatus>('/billing/mercado-pago/cancel', {}),
};
