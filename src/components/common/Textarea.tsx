import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

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
            w-full px-4 py-2.5 border rounded-xl text-text-primary placeholder-text-soft bg-white
            border-border focus:outline-none focus:border-primary-vibrant focus:ring-4 focus:ring-primary-light/60
            transition-shadow disabled:bg-bg-secondary disabled:cursor-not-allowed resize-none
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
