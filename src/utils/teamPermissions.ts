import type { TeamRole } from '@/types/team';

/**
 * A escada de papéis, do lado do cliente.
 *
 * Espelha `src/teams/team-roles.ts` do backend, e a direção da cópia importa:
 * o servidor é quem AUTORIZA, e este arquivo existe apenas para a tela não
 * oferecer um botão que a resposta vai recusar. Se os dois discordarem, a tela
 * mostra a mais restritiva e o servidor tem a palavra final — nunca o
 * contrário.
 */
const RANK: Record<TeamRole, number> = { member: 0, manager: 1, admin: 2, owner: 3 };

export const ROLE_LABEL: Record<TeamRole, string> = {
  member: 'Membro',
  manager: 'Gerente',
  admin: 'Administrador',
  owner: 'Dono',
};

/** O que cada papel pode, em uma frase. É o texto ao lado da escolha. */
export const ROLE_DESCRIPTION: Record<TeamRole, string> = {
  member: 'Vê o painel e entrega as tarefas atribuídas a ele.',
  manager: 'Distribui o trabalho: cria, atribui e move tarefas, convida e aprova entradas.',
  admin: 'Cuida das pessoas: define papéis e cargos, remove membros e edita a equipe.',
  owner: 'Responde pela equipe. Só ele transfere a posse ou exclui a equipe.',
};

export function normalizeRole(raw: string | null | undefined): TeamRole {
  return raw === 'owner' || raw === 'admin' || raw === 'manager' ? raw : 'member';
}

export function atLeast(role: string | null | undefined, min: TeamRole): boolean {
  return RANK[normalizeRole(role)] >= RANK[min];
}

export function compareRoles(a: string | null | undefined, b: string | null | undefined): number {
  return RANK[normalizeRole(a)] - RANK[normalizeRole(b)];
}

/**
 * O que EU posso fazer nesta equipe, em uma resposta só.
 *
 * A tela pergunta isto dezenas de vezes por render; espalhar `atLeast(...)`
 * pelos componentes é como a versão anterior acabou escondendo do gerente
 * todos os botões que ele tinha direito de usar — cada trecho decidia por
 * conta própria e ninguém conferia o conjunto.
 */
export interface TeamAbilities {
  role: TeamRole;
  /** Cria, atribui, move e exclui tarefas da equipe. */
  gerenciaTarefas: boolean;
  /** Gera link de convite e decide pedidos de entrada. */
  convida: boolean;
  /** Define papéis e cargos, remove pessoas, edita nome e cor. */
  administra: boolean;
  /** Transfere a posse e exclui a equipe. */
  ehDono: boolean;
  /** Vê a aba de Gestão. */
  veGestao: boolean;
}

export function abilitiesOf(role: string | null | undefined): TeamAbilities {
  const papel = normalizeRole(role);
  return {
    role: papel,
    gerenciaTarefas: atLeast(papel, 'manager'),
    convida: atLeast(papel, 'manager'),
    administra: atLeast(papel, 'admin'),
    ehDono: papel === 'owner',
    veGestao: atLeast(papel, 'manager'),
  };
}

/**
 * Papéis que EU posso conceder a OUTRA pessoa.
 *
 * Duas regras, as mesmas do servidor: só abaixo de mim, e só sobre quem está
 * abaixo de mim. Devolver a lista vazia é a forma de a tela dizer "aqui você
 * não mexe" sem precisar de um `if` em cada botão.
 */
export function assignableBy(meu: TeamRole, alvo: TeamRole): TeamRole[] {
  if (!atLeast(meu, 'admin')) return [];
  if (compareRoles(alvo, meu) >= 0) return [];
  return (['member', 'manager', 'admin'] as const).filter(r => compareRoles(r, meu) < 0);
}
