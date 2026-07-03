import { api } from './api';

export interface FeedbackStatus {
  canSend: boolean;
  // Quando canSend=false, instante (ISO) em que o próximo envio libera.
  nextAllowedAt: string | null;
}

// Central de Feedbacks: 1 mensagem por usuário por semana (validado no servidor).
export const feedbackService = {
  status: () => api.get<FeedbackStatus>('/feedback/status'),
  send: (message: string) => api.post<FeedbackStatus & { id: string }>('/feedback', { message }),
};
