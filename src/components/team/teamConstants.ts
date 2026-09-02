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
 * CARGOS sugeridos ('' = sem cargo).
 *
 * Cargo é rótulo escrito pela equipe; papel é o que a pessoa pode fazer (ver
 * utils/teamPermissions). O nome antigo desta lista era ROLE_OPTIONS, o que
 * confundia as duas coisas justamente onde elas aparecem lado a lado na tela.
 */
export const TITLE_OPTIONS = [
  { value: '', label: 'Sem cargo' },
  { value: 'Gerente de Projeto', label: 'Gerente de Projeto' },
  { value: 'Desenvolvedor(a)', label: 'Desenvolvedor(a)' },
  { value: 'Designer', label: 'Designer' },
  { value: 'Produto', label: 'Produto' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Analista', label: 'Analista' },
  { value: 'QA / Testes', label: 'QA / Testes' },
  { value: 'Suporte', label: 'Suporte' },
];
