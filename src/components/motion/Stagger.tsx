import React from 'react';
import { useInView } from './useInView';

interface StaggerProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'div' | 'ul' | 'ol' | 'section';
  /** Intervalo entre um filho e o próximo, em ms. @default 55 */
  gap?: number;
  /** Atraso antes do primeiro, em ms. */
  delay?: number;
}

/**
 * Faz os filhos DIRETOS entrarem em cascata quando o grupo chega à tela.
 *
 * Não embrulha nada: as classes de grade/flex continuam valendo porque os
 * filhos seguem sendo filhos diretos do mesmo elemento. O índice de cada um
 * vem de `:nth-child` no CSS — nenhum `style` por item, nenhum componente por
 * item, e do décimo em diante todos entram juntos.
 *
 * Itens acrescentados DEPOIS da entrada também animam (a regra é do CSS e
 * vale para qualquer filho novo), o que serve bem a listas que crescem.
 */
export const Stagger: React.FC<StaggerProps> = ({
  as = 'div',
  gap,
  delay,
  className = '',
  style,
  children,
  ...rest
}) => {
  const { ref, visto } = useInView<HTMLElement>();
  const vars: Record<string, string> = {};
  if (gap !== undefined) vars['--fx-gap'] = `${gap}ms`;
  if (delay !== undefined) vars['--fx-delay'] = `${delay}ms`;

  return React.createElement(
    as,
    {
      ref,
      className: `fx-stagger ${visto ? 'is-in' : ''} ${className}`,
      style: { ...vars, ...style },
      ...rest,
    },
    children,
  );
};
