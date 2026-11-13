import React, { useEffect, useState } from 'react';
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
 * A cascata é da ENTRADA do grupo, e só dela: pouco depois de terminar, o
 * grupo se desliga (`is-done`). Se a regra ficasse valendo, um item que muda
 * de posição — o React o reinsere no DOM — repetiria a animação a cada
 * reordenação. Para listas que ganham, perdem e reordenam itens o tempo todo,
 * o componente certo é o AnimatedList.
 */
// Folga para o último filho (9 intervalos + duração) terminar com sobra.
const FIM_DA_CASCATA_MS = 1600;

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
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    if (!visto) return;
    const id = setTimeout(() => setPronto(true), FIM_DA_CASCATA_MS + (delay ?? 0));
    return () => clearTimeout(id);
  }, [visto, delay]);
  const vars: Record<string, string> = {};
  if (gap !== undefined) vars['--fx-gap'] = `${gap}ms`;
  if (delay !== undefined) vars['--fx-delay'] = `${delay}ms`;

  return React.createElement(
    as,
    {
      ref,
      className: `fx-stagger ${visto ? 'is-in' : ''} ${pronto ? 'is-done' : ''} ${className}`,
      style: { ...vars, ...style },
      ...rest,
    },
    children,
  );
};
