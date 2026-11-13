import React from 'react';

/**
 * Enfeites de fundo e de borda. São todos `aria-hidden` e não recebem toque:
 * existem só para os olhos.
 */

interface BorderBeamProps {
  /** Duração de uma volta, em segundos. @default 6 */
  duration?: number;
  /** Espessura do feixe em px. @default 1.5 */
  size?: number;
}

/**
 * Feixe de luz que percorre a borda do elemento pai.
 *
 * O pai precisa ser `relative` e ter o raio de borda que o feixe deve seguir
 * (ele herda com `border-radius: inherit`). Um por tela: é para apontar O
 * cartão que importa.
 */
export const BorderBeam: React.FC<BorderBeamProps> = ({ duration, size }) => {
  const vars: Record<string, string> = {};
  if (duration !== undefined) vars['--fx-beam-dur'] = `${duration}s`;
  if (size !== undefined) vars['--fx-beam-size'] = `${size}px`;
  return <span aria-hidden="true" className="fx-beam" style={vars} />;
};

interface AuroraProps {
  /** Opacidade das manchas (0–1). @default 0.16 */
  intensity?: number;
  className?: string;
}

/**
 * Manchas de cor da marca à deriva, para ficar ATRÁS do conteúdo.
 *
 * Ocupa o pai inteiro (`absolute inset-0`); o pai precisa ser `relative` — ou
 * passe `fixed` em `className` para cobrir a janela.
 */
export const Aurora: React.FC<AuroraProps> = ({ intensity, className = '' }) => (
  <div
    aria-hidden="true"
    className={`fx-aurora ${className}`}
    style={
      intensity !== undefined
        ? ({ '--fx-aurora-o': intensity } as React.CSSProperties)
        : undefined
    }
  >
    <i />
    <i />
    <i />
  </div>
);

interface MarqueeProps {
  children: React.ReactNode;
  /** Segundos para uma volta completa. @default 30 */
  duration?: number;
  /** Espaço entre os itens (qualquer medida CSS). @default 1rem */
  gap?: string;
  className?: string;
}

/**
 * Faixa de itens que corre na horizontal, sem fim, e pausa no hover.
 *
 * O conteúdo é renderizado duas vezes para emendar a volta; a cópia é
 * `aria-hidden`, então o leitor de tela lê a lista uma vez só.
 */
export const Marquee: React.FC<MarqueeProps> = ({ children, duration, gap, className = '' }) => {
  const vars: Record<string, string> = {};
  if (duration !== undefined) vars['--fx-marquee-dur'] = `${duration}s`;
  if (gap !== undefined) vars['--fx-marquee-gap'] = gap;
  return (
    <div className={`fx-marquee ${className}`} style={vars}>
      <div>{children}</div>
      <div aria-hidden="true">{children}</div>
    </div>
  );
};
