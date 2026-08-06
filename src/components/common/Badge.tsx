import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantStyles = {
  default: 'bg-bg-secondary text-text-primary',
  success: 'bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-300',
  warning: 'bg-yellow-100 dark:bg-yellow-500/15 text-yellow-800 dark:text-yellow-300',
  danger: 'bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300',
  info: 'bg-primary-light text-primary-dark',
  purple: 'bg-purple-100 dark:bg-purple-500/15 text-purple-800 dark:text-purple-300',
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', className = '', children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
          ${variantStyles[variant]}
          ${className}
        `}
        {...props}
      >
        {children}
      </span>
    );
  },
);

Badge.displayName = 'Badge';
