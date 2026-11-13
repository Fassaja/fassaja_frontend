import React from 'react';
import { useInView } from './useInView';

type Tag = 'div' | 'section' | 'li' | 'article' | 'header';

interface RevealProps extends React.HTMLAttributes<HTMLElement> {
  as?: Tag;
  /** Atraso em ms, para encadear blocos vizinhos. */
  delay?: number;
  /** Duração em ms. @default 600 */
  duration?: number;
  /** De quantos px o bloco sobe. @default 14 */
  y?: number;
}

/**
 * Bloco que entra com subida + desfoque quando chega à tela (uma vez).
 *
 * O JS só marca `is-in`; a animação é CSS (ver "KIT DE MOVIMENTO" em
 * index.css). Depois de entrar, o elemento não guarda `transform` nem
 * `filter` — nada de resíduo que atrapalhe `position: fixed` ou nitidez.
 */
export const Reveal: React.FC<RevealProps> = ({
  as = 'div',
  delay,
  duration,
  y,
  className = '',
  style,
  children,
  ...rest
}) => {
  const { ref, visto } = useInView<HTMLElement>();
  const vars: Record<string, string> = {};
  if (delay !== undefined) vars['--fx-delay'] = `${delay}ms`;
  if (duration !== undefined) vars['--fx-dur'] = `${duration}ms`;
  if (y !== undefined) vars['--fx-y'] = `${y}px`;

  return React.createElement(
    as,
    {
      ref,
      className: `fx-reveal ${visto ? 'is-in' : ''} ${className}`,
      style: { ...vars, ...style },
      ...rest,
    },
    children,
  );
};
