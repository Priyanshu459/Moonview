export function Spinner() {
  return (
    <div
      style={{
        display: 'inline-block',
        width: '1.5rem',
        height: '1.5rem',
        border: '3px solid var(--color-border)',
        borderTopColor: 'var(--color-primary)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }}
    />
  );
}
