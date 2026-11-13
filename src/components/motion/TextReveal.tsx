import React from 'react';

interface TextRevealProps {
  text: string;
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'p';
  /** Atraso antes da primeira palavra, em ms. */
  delay?: number;
  className?: string;
}

/**
 * Texto que entra palavra por palavra.
 *
 * Por PALAVRA e não por letra: um título de quatro palavras vira quatro
 * elementos, não trinta, e a quebra de linha continua acontecendo entre
 * palavras como em qualquer parágrafo.
 *
 * Leitor de tela: as palavras soltas são decorativas (`aria-hidden`) e o texto
 * inteiro vai num trecho só-para-leitor, senão ele seria lido aos soquinhos.
 *
 * Para reanimar quando o texto muda (o título de cada página), dê `key={text}`
 * a quem usa.
 */
export const TextReveal: React.FC<TextRevealProps> = ({
  text,
  as = 'span',
  delay,
  className = '',
}) => {
  const palavras = text.split(' ');
  return React.createElement(
    as,
    {
      className,
      style: delay !== undefined ? ({ '--fx-delay': `${delay}ms` } as React.CSSProperties) : undefined,
    },
    <span key="leitor" className="sr-only">
      {text}
    </span>,
    palavras.map((palavra, i) => (
      <span
        key={i}
        aria-hidden="true"
        className="fx-word"
        style={{ '--fx-i': i } as React.CSSProperties}
      >
        {i < palavras.length - 1 ? `${palavra} ` : palavra}
      </span>
    )),
  );
};
