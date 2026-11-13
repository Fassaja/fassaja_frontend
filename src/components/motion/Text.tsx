import React from 'react';

interface TextoProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

/**
 * Texto com um brilho que atravessa as letras, em laço.
 *
 * Para selos e chamadas curtas ("Fassajá Pro", "Novo"). Anima a posição de um
 * degradê recortado no texto — é repintura, não compositor, então o lugar dele
 * é em poucas palavras, não num parágrafo.
 */
export const ShinyText: React.FC<TextoProps> = ({ className = '', children, ...rest }) => (
  <span className={`fx-shiny-text ${className}`} {...rest}>
    {children}
  </span>
);

/** Texto pintado com o degradê da marca (azul → turquesa → violeta). Estático. */
export const GradientText: React.FC<TextoProps> = ({ className = '', children, ...rest }) => (
  <span className={`fx-gradient-text ${className}`} {...rest}>
    {children}
  </span>
);
