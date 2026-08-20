import { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--color-bg-elevated)', borderRadius: '0.5rem' }}>
      <h2 style={{ marginBottom: '1rem', color: 'var(--color-text-primary)' }}>{title}</h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: action ? '2rem' : 0 }}>{description}</p>
      {action}
    </div>
  );
}
