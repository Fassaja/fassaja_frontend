import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

const paddingStyles = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-6',
  lg: 'p-8',
};

/**
 * `fx-spotlight`: todo cartão ganha um foco de luz que segue o ponteiro (ver
 * "KIT DE MOVIMENTO" em index.css). É só uma camada de fundo alimentada por
 * um ouvinte único no documento — custo zero de render, e inexistente no
 * celular. Quem passa um degradê próprio em `className` fica sem o foco, de
 * propósito: o fundo de quem usa o cartão vence.
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, padding = 'md', hoverable = false, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          fx-spotlight bg-surface rounded-2xl border border-border shadow-sm transition-all duration-200
          ${paddingStyles[padding]}
          ${hoverable ? 'hover:shadow-md hover:-translate-y-0.5 hover:border-primary-vibrant/30 cursor-pointer' : ''}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';
