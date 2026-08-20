import { Button } from '../ui/Button.js';
import { ApiError } from '../../api/client.js';

interface ErrorStateProps {
  error: Error | null;
  onRetry?: () => void;
  title?: string;
}

export function ErrorState({ error, onRetry, title = 'An error occurred' }: ErrorStateProps) {
  let message = error?.message || 'Something went wrong';
  
  if (error instanceof ApiError) {
    if (error.status === 404) message = 'The requested resource was not found.';
    else if (error.status === 403) message = 'You do not have permission to access this.';
    else if (error.status === 401) message = 'Please log in to continue.';
    else if (error.status >= 500) message = 'Our servers are experiencing issues. Please try again later.';
  }

  return (
    <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--color-bg-elevated)', borderRadius: '0.5rem' }}>
      <h2 style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>{title}</h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="primary">Try Again</Button>
      )}
    </div>
  );
}
