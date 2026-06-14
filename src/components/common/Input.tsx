import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-primary mb-2">
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
            className={`
              w-full px-4 py-2.5 border rounded-xl text-text-primary placeholder-text-soft bg-white
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
          <p className="mt-1 text-xs text-danger">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-xs text-text-secondary">{helperText}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
