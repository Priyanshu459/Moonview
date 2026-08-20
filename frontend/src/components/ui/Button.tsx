import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', isLoading, disabled, style, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        style={{
          padding: '0.75rem 1.5rem',
          borderRadius: '0.25rem',
          border: variant === 'secondary' ? '1px solid var(--color-border-strong)' : 'none',
          fontWeight: 600,
          cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
          opacity: disabled || isLoading ? 0.7 : 1,
          background: variant === 'primary' ? 'var(--color-brand-primary)' : 'var(--color-bg-elevated)',
          color: 'var(--color-text-primary)',
          transition: 'all var(--transition-fast)',
          ...style
        }}
        {...props}
      >
        {isLoading ? 'Loading...' : children}
      </button>
    );
  }
);
Button.displayName = 'Button';
