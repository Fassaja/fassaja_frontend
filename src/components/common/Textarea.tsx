import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

/**
 * `text-base leading-6` são deliberados, não decoração:
 *
 * - `leading-6` fixa a altura de linha em 24px. Sem isso o textarea herda o
 *   line-height do preflight, e se o navegador computar um valor fracionário
 *   (acontece no Android com a Plus Jakarta Sans) a altura de `rows` deixa de
 *   ser múltiplo exato de linha — a última linha aparece cortada ao meio.
 * - `text-base` (16px) evita o zoom automático que o Safari do iOS aplica ao
 *   focar campos com fonte menor que 16px.
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-primary mb-2">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`
            w-full px-4 py-2.5 border rounded-xl text-text-primary placeholder-text-soft bg-surface
            border-border focus:outline-none focus:border-primary-vibrant focus:ring-4 focus:ring-primary-light/60
            transition-shadow disabled:bg-bg-secondary disabled:cursor-not-allowed resize-none
            text-base leading-6
            ${error ? 'border-danger focus:border-danger focus:ring-red-100' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-danger">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-xs text-text-secondary">{helperText}</p>
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
