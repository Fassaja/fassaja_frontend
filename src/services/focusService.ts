import { api } from './api';

export interface FocusSession {
  id: string;
  kind: 'foco' | 'pausa';
  taskId: string | null;
  taskTitle: string | null;
  projectId: string | null;
  startedAt: string;
  endsAt: string;
  endedAt: string | null;
  completed: boolean;
  /** Quanto faltava no instante da resposta. Serve só de ponto de partida. */
  segundosRestantes: number;
}

export interface MinutosDoDia {
  date: string;
  minutes: number;
  /** Quantas sessões naquele dia — o ritmo do Pomodoro se mede em sessões. */
  sessions: number;
}

export const focusService = {
  current: () => api.get<FocusSession | null>('/focus/current'),
  start: (minutes: number, taskId?: string, kind: 'foco' | 'pausa' = 'foco') =>
    api.post<FocusSession>('/focus/start', { minutes, taskId, kind }),
  stop: (id: string) => api.post<FocusSession>(`/focus/${id}/stop`, {}),
  /** "Não quero registrar este tempo": apaga a sessão encerrada. */
  discard: (id: string) => api.delete<void>(`/focus/${id}`),
  byTask: () => api.get<{ taskId: string; minutes: number }[]>('/focus/by-task'),
  history: (from: string, to: string) =>
    api.get<MinutosDoDia[]>(`/focus/history?from=${from}&to=${to}`),
};
