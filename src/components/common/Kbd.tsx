import React from 'react';

/**
 * Uma tecla, desenhada como tecla.
 *
 * Um quadradinho por tecla — não "⌘K" numa etiqueta só. É como o teclado é, e
 * é o que faz a pessoa reconhecer a instrução sem ler: ela procura os dois
 * quadradinhos, não a frase.
 */
export const Kbd: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <kbd
    className={`inline-grid place-items-center min-w-[20px] h-[20px] px-1 rounded-[5px] border border-border bg-bg-secondary text-[11px] font-semibold leading-none text-text-secondary ${className}`}
  >
    {children}
  </kbd>
);
