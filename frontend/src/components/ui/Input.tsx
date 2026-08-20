import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, style, id, ...props }, ref) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', ...style }}>
        {label && <label htmlFor={id} style={{ fontSize: '0.875rem' }}>{label}</label>}
        <input
          ref={ref}
          id={id}
          style={{
            padding: '0.75rem',
            borderRadius: '0.25rem',
            border: error ? '1px solid var(--color-error)' : '1px solid var(--color-border)',
            background: 'var(--color-bg-base)',
            color: 'var(--color-text-primary)',
          }}
          {...props}
        />
        {error && <span style={{ color: 'var(--color-error)', fontSize: '0.75rem' }}>{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';
