import { CSSProperties } from 'react';

export function Skeleton({ style }: { style?: CSSProperties }) {
  return (
    <div
      style={{
        background: 'var(--color-bg-elevated)',
        animation: 'pulse 1.5s infinite',
        borderRadius: '0.25rem',
        ...style
      }}
    />
  );
}
