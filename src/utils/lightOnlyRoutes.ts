/**
 * Telas que ficam SEMPRE no tema claro, independente da preferência da pessoa
 * ou do sistema operacional.
 *
 * São as telas de entrada: login, cadastro e recuperação de senha. Duas razões:
 *
 * 1. O botão do Google é desenhado pelo Google, não por nós. Ele não herda
 *    nosso CSS e no tema escuro aparecia com uma borda branca dura no meio de
 *    um fundo escuro — o tipo de detalhe que não dá para corrigir de fora.
 * 2. É a primeira tela que alguém vê, muitas vezes antes de ter qualquer
 *    preferência salva. Uma identidade visual só, e previsível, vale mais aqui
 *    do que acompanhar o sistema.
 *
 * Esta lista é a fonte única. `public/theme-init.js` PRECISA repetir os mesmos
 * caminhos (ele roda antes do bundle, então não consegue importar daqui), e é
 * por isso que existe test/lightOnlyTheme.unit.mts: ele lê o arquivo de verdade
 * e falha se as duas listas divergirem. Sem esse teste, acrescentar uma tela
 * aqui e esquecer lá dá um flash escuro no primeiro paint — um defeito que só
 * aparece em quem usa tema escuro, e só por uma fração de segundo.
 */
export const LIGHT_ONLY_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
] as const;

/** O caminho atual é uma das telas que ficam sempre claras? */
export function isLightOnlyPath(pathname: string): boolean {
  return (LIGHT_ONLY_PATHS as readonly string[]).includes(pathname);
}
