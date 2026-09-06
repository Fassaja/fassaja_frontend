import { api } from './api';

/** Usuário público devolvido pelas rotas de /auth (nunca inclui hash de senha). */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  streakDays: number[];
  dailyGoal: number;
  weeklyGoal: number;
  nameChangedAt: string | null;
  passwordChangedAt: string | null;
}

/**
 * A prova de identidade que o servidor exige para excluir a conta.
 *
 * A exclusão é irreversível, então a sessão sozinha não basta — um cookie
 * roubado não pode apagar a conta de ninguém. Qual prova vale depende da conta:
 *
 *   `password` — quem tem senha confirma com ela, num passo só.
 *   `token`    — quem NÃO tem senha (entrou pelo Google e nunca definiu uma)
 *                pede o e-mail em `requestAccountDeletion` e confirma pelo
 *                link que chega na caixa.
 *
 * Por que não um ID token do Google, que seria o análogo direto: o login usa o
 * GIS em modo REDIRECT (o Google faz um POST de navegação direto para a API),
 * justamente porque o popup quebrava no celular e no PWA. Nesse modo este
 * código nunca vê um token — não há o que enviar. O e-mail prova a mesma coisa
 * e funciona em qualquer cliente.
 */
export type ProvaDeExclusao = { password: string } | { token: string };

/**
 * Exclui a conta e os dados pessoais (LGPD). Projetos solo e tarefas pessoais
 * são apagados; o conteúdo de equipe permanece com a equipe.
 */
export const deleteAccount = (prova: ProvaDeExclusao) =>
  api.delete<void>('/auth/account', prova);

/**
 * Pede o e-mail que confirma a exclusão — só faz sentido para conta sem senha.
 *
 * A resposta é sempre a mesma e não diz se o e-mail saiu: a tela deve mostrar
 * "se for necessário, enviamos" e parar por aí.
 */
export const requestAccountDeletion = () =>
  api.post<{ message: string }>('/auth/account/delete-request', {});

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

/**
 * Persiste as metas de tarefas. Os dois campos são opcionais e independentes:
 * a tela salva no blur de cada um, e mandar sempre os dois faria o primeiro
 * blur gravar por cima do campo que ainda estava sendo digitado.
 */
export const updateGoals = (goals: { dailyGoal?: number; weeklyGoal?: number }) =>
  api.patch<PublicUser>('/auth/goals', goals);

/** Lista ordenada de dias produtivos ('YYYY-MM-DD') do usuário — para hidratar. */
export const getProductiveDays = () => api.get<string[]>('/auth/productive-days');

/**
 * Registra um dia produtivo. `date` é o dia LOCAL do cliente (todayISO()) — o
 * servidor só armazena, evitando erro perto da meia-noite. Idempotente (upsert
 * em userId+date); devolve a lista atualizada.
 */
export const recordProductiveDay = (date: string) =>
  api.post<string[]>('/auth/productive-days', { date });
