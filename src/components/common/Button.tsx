import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles = {
  primary: 'bg-primary-vibrant text-white hover:bg-primary-hover hover:shadow-md hover:shadow-primary-vibrant/25 active:bg-blue-700',
  secondary: 'bg-bg-secondary text-text-primary border border-border hover:bg-primary-light hover:border-primary-vibrant/30 active:bg-primary-light/70',
  ghost: 'bg-transparent text-text-primary hover:bg-primary-light/60 active:bg-primary-light',
  danger: 'bg-danger text-white hover:bg-rose-600 hover:shadow-md hover:shadow-danger/25 active:bg-rose-700',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    isLoading = false,
    icon,
    className = '',
    disabled,
    children,
    ...props
  }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        // Diz ao leitor de tela que o botão está ocupado. O rótulo continua
        // legível (é `opacity-0`, não `hidden`), então o nome acessível não
        // some no meio da operação.
        aria-busy={isLoading || undefined}
        className={`
          relative flex items-center justify-center gap-2 rounded-lg font-semibold
          transition-all duration-150 active:scale-[0.97]
          focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-light/60
          disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {/*
          A roda fica FORA do fluxo, sobreposta ao rótulo.

          Ela era mais um item do flex, ao lado do texto: ao começar a salvar,
          o botão ganhava os 16px do ícone mais os 8px do `gap` e ESTICAVA uns
          24px de repente, empurrando o "Cancelar" para a esquerda. Era isso o
          "bug visual" ao confirmar — a roda aparecendo GRUDADA no rótulo e a
          barra inteira dando um solavanco.

          Quando havia `icon`, a troca era limpa (um saía, outro entrava, mesmo
          tamanho). Sem `icon` — que é o caso de todo botão de salvar do app —
          era pura adição.

          Absoluta, ela não ocupa espaço nenhum: o rótulo continua reservando a
          largura de sempre, então a medida do botão é a MESMA carregando ou
          não. Não há como voltar a pular.
        */}
        {isLoading && (
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </span>
        )}

        {/* `opacity-0` e não `hidden`: o conteúdo precisa continuar ocupando o
            espaço dele, senão o botão encolhe e o solavanco volta invertido. */}
        <span className={`flex items-center gap-2 ${isLoading ? 'opacity-0' : ''}`}>
          {icon}
          {children}
        </span>
      </button>
    );
  },
);

Button.displayName = 'Button';
