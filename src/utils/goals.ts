/**
 * Regras das metas de tarefas, num lugar só.
 *
 * Existe porque agora há TRÊS pontos que precisam concordar: a tela de
 * Ajustes, a semeadura que envia a meta antiga do localStorage para o servidor,
 * e o `UpdateGoalsDto` do backend. Enquanto a meta vivia só no navegador,
 * divergir não custava nada — o valor nunca saía dali. Agora um número que a
 * tela aceita e a API recusa vira uma semeadura que falha calada, e a pessoa
 * volta a perder a meta ao trocar de aparelho: exatamente o bug que isto veio
 * consertar.
 */

/** Precisa bater com os defaults de `User` no schema do backend. */
export const GOAL_DEFAULTS = { daily: 5, weekly: 25 } as const;

/**
 * Precisa bater com `UpdateGoalsDto`.
 *
 * Mínimo 1, e não 0: meta zero é a barra de progresso dividindo por zero e a
 * comemoração de "meta batida" disparando a cada tarefa. Quem não quer meta
 * ignora o número — não precisa zerá-lo.
 *
 * O teto diário é bem menor que o semanal porque ninguém conclui 99 tarefas
 * num dia; o número existe para um valor absurdo não esticar a barra do painel
 * até quebrar o layout.
 */
export const GOAL_LIMITS = {
  daily: { min: 1, max: 99 },
  weekly: { min: 1, max: 999 },
} as const;

export type GoalKind = keyof typeof GOAL_LIMITS;

export interface Goals {
  daily: number;
  weekly: number;
}

/**
 * Traz um valor para dentro da faixa válida.
 *
 * Aceita string porque o campo da tela é texto: `parseInt` de vazio ou de lixo
 * dá NaN, e NaN escapando daqui viraria `null` no JSON e um 400 na API.
 */
export function clampGoal(raw: string | number, kind: GoalKind): number {
  const { min, max } = GOAL_LIMITS[kind];
  const n = typeof raw === 'number' ? Math.trunc(raw) : parseInt(raw, 10);
  if (!Number.isFinite(n)) return GOAL_DEFAULTS[kind];
  return Math.min(max, Math.max(min, n));
}

/** As duas metas dentro da faixa — o que pode ser enviado à API. */
export function clampGoals(goals: Goals): Goals {
  return { daily: clampGoal(goals.daily, 'daily'), weekly: clampGoal(goals.weekly, 'weekly') };
}

/** A pessoa mexeu na meta em algum momento, ou é o padrão intocado? */
export function isCustomized(goals: Goals): boolean {
  return goals.daily !== GOAL_DEFAULTS.daily || goals.weekly !== GOAL_DEFAULTS.weekly;
}

/**
 * Vale enviar a meta local para o servidor nesta primeira carga?
 *
 * A meta de quem já usava o app está no localStorage e o servidor nunca a
 * recebeu — não há como reconstruí-la a partir do banco, então a recuperação
 * tem de partir do cliente. Mas ela só pode acontecer sob DUAS condições, e a
 * segunda é a que evita estragar tudo:
 *
 * 1. o valor local foi customizado — não há o que recuperar de um padrão; e
 * 2. o servidor ainda está no padrão.
 *
 * Sem a condição 2, abrir o app num aparelho novo (localStorage limpo, meta no
 * padrão) sobrescreveria com 5/25 a meta real que já estava salva no servidor.
 * O sentido da recuperação é só um: do navegador para o servidor, e só
 * enquanto o servidor não tiver nada a dizer.
 *
 * Limite conhecido e aceito: duas máquinas com metas locais DIFERENTES, ambas
 * ainda não semeadas — a primeira a abrir o app grava a dela, e a segunda vê
 * que o servidor já não está no padrão e adota o valor da primeira. Não há
 * como decidir melhor: nada no sistema diz qual das duas é a mais recente.
 */
export function shouldSeed(local: Goals, server: Goals): boolean {
  return isCustomized(local) && !isCustomized(server);
}
