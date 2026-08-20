import { ReactNode } from 'react';

export function PageContainer({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem 1rem',
        ...style
      }}
    >
      {children}
    </div>
  );
}
