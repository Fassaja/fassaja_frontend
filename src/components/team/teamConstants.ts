// Cores estáveis para avatares (fallback sem foto).
export const AVATAR_COLORS = ['#2477FF', '#8B5CF6', '#22C55E', '#FB7185', '#FBBF24', '#2DD4BF'];

// Paleta de identidade da equipe (mesma usada nos projetos, para consistência).
export const TEAM_COLORS = [
  '#2477FF',
  '#8B5CF6',
  '#22C55E',
  '#F43F5E',
  '#FBBF24',
  '#EC4899',
  '#06B6D4',
  '#14B8A6',
];

/**
 * SUGESTÕES de cargo — não uma lista fechada.
 *
 * O campo aceita qualquer texto de até 40 caracteres, igual ao servidor. Estas
 * entradas só poupam digitação nos casos comuns; a versão anterior era um menu
 * e, com ele, o produto decidia quais cargos uma empresa podia ter.
 *
 * Cargo é rótulo escrito pela equipe; papel é o que a pessoa pode fazer (ver
 * utils/teamPermissions). São coisas diferentes e aparecem lado a lado na tela.
 */
export const TITLE_SUGGESTIONS = [
  'Gerente de Projeto',
  'Desenvolvedor(a)',
  'Designer',
  'Produto',
  'Marketing',
  'Analista',
  'QA / Testes',
  'Suporte',
];
