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
 * Exclui a conta e os dados pessoais (LGPD). Irreversível — o servidor exige a
 * senha de novo, mesmo já havendo sessão. Projetos solo e tarefas pessoais são
 * apagados; o conteúdo de equipe permanece com a equipe.
 */
export const deleteAccount = (password: string) =>
  api.delete<void>('/auth/account', { password });

/**
 * Passo 1 do "esqueci minha senha": pede o e-mail com o link de redefinição.
 * A resposta é sempre a mesma, exista ou não a conta (não vaza cadastros).
 */
export const forgotPassword = (email: string) =>
  api.post<{ message: string }>('/auth/forgot-password', { email });

/**
 * Passo 2: troca a senha usando o token do e-mail. Não faz login — o servidor
 * encerra todas as sessões, então o usuário entra de novo com a senha nova.
 */
export const resetPassword = (token: string, password: string) =>
  api.post<{ message: string }>('/auth/reset-password', { token, password });

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
