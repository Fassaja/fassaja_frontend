import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

/**
 * Campo de texto com rótulo, erro e texto de apoio.
 *
 * O rótulo é LIGADO ao campo por `htmlFor`/`id`. Sem esse par, o `<label>` é
 * só um texto acima da caixa: quem usa leitor de tela ouve "campo de edição,
 * em branco", sem saber o que digitar ali, e clicar no rótulo não leva o foco
 * ao campo. O id vem do `useId` do React quando não é informado — assim dois
 * campos na mesma tela nunca colidem.
 *
 * Erro e texto de apoio são anunciados junto pelo `aria-describedby`, e o erro
 * marca `aria-invalid` — a cor vermelha sozinha não comunica nada a quem não a
 * enxerga.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className = '', id, ...props }, ref) => {
    const gerado = React.useId();
    const inputId = id ?? gerado;
    const erroId = `${inputId}-erro`;
    const apoioId = `${inputId}-apoio`;
    const descricao = [error ? erroId : null, !error && helperText ? apoioId : null]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text-primary mb-2"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={descricao || undefined}
            className={`
              w-full px-4 py-2.5 border rounded-xl text-text-primary placeholder-text-soft bg-surface
              border-border focus:outline-none focus:border-primary-vibrant focus:ring-4 focus:ring-primary-light/60
              transition-shadow disabled:bg-bg-secondary disabled:cursor-not-allowed
              ${icon ? 'pl-10' : ''}
              ${error ? 'border-danger focus:border-danger focus:ring-red-100' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <p id={erroId} className="mt-1 text-xs text-danger">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={apoioId} className="mt-1 text-xs text-text-secondary">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
