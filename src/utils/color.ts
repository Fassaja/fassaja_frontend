/**
 * Tingimento de cores que vêm dos DADOS (cor do projeto, da tag, do evento) —
 * não da paleta do tema. Essas cores são escolha do usuário e não mudam com o
 * tema; o que precisa mudar é a FORÇA com que elas tingem o fundo e o quanto
 * clareiam para virar texto legível.
 *
 * Antes cada chip concatenava um alfa fixo em hex (`tag.color + '1A'`). Sobre
 * fundo claro, 10% de uma cor saturada é um tom suave; sobre fundo escuro, é
 * praticamente invisível. Aqui a intensidade sai de uma variável CSS definida
 * por tema em index.css, então o componente não precisa saber qual tema está
 * ativo — nem chamar um hook.
 */

export type TintLevel = 'subtle' | 'medium' | 'strong';

const LEVEL_VAR: Record<TintLevel, string> = {
  subtle: '--tint-subtle',
  medium: '--tint-medium',
  strong: '--tint-strong',
};

/** Fundo tingido com a cor do dado, na intensidade certa para o tema atual. */
export function tint(color: string, level: TintLevel = 'subtle'): string {
  return `color-mix(in srgb, ${color} var(${LEVEL_VAR[level]}), transparent)`;
}

/**
 * A mesma cor, ajustada para servir de TEXTO sobre o fundo tingido. No tema
 * claro devolve a cor original; no escuro, mistura com branco — um azul ou
 * roxo de tom médio sobre superfície escura não alcança contraste de leitura.
 */
export function chipText(color: string): string {
  return `color-mix(in srgb, ${color} var(--chip-text-strength), var(--chip-text-target))`;
}
