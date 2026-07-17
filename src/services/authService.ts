import { api } from './api';

/** Usuário público devolvido pelas rotas de /auth (nunca inclui hash de senha). */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  streakDays: number[];
  nameChangedAt: string | null;
  passwordChangedAt: string | null;
}

/**
 * Persiste os dias da sequência (0=domingo … 6=sábado) no servidor.
 * O backend ordena o array antes de salvar e devolve o PublicUser atualizado.
 */
export const updateStreakDays = (streakDays: number[]) =>
  api.patch<PublicUser>('/auth/streak-days', { streakDays });

/** Lista ordenada de dias produtivos ('YYYY-MM-DD') do usuário — para hidratar. */
export const getProductiveDays = () => api.get<string[]>('/auth/productive-days');

/**
 * Registra um dia produtivo. `date` é o dia LOCAL do cliente (todayISO()) — o
 * servidor só armazena, evitando erro perto da meia-noite. Idempotente (upsert
 * em userId+date); devolve a lista atualizada.
 */
export const recordProductiveDay = (date: string) =>
  api.post<string[]>('/auth/productive-days', { date });
