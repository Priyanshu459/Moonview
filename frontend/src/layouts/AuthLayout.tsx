import { Outlet, Link } from 'react-router';

export function AuthLayout() {
  return (
    <div style={{ 
      minHeight: '100dvh', 
      display: 'flex', 
      flexDirection: 'column', 
      background: 'url("https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=2070&auto=format&fit=crop") center/cover no-repeat',
      position: 'relative'
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
      <header style={{ padding: '2rem 4%', position: 'relative', zIndex: 10 }}>
        <Link to="/" style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'white', textDecoration: 'none' }}>
          Moon<span style={{ color: 'var(--color-brand-primary)' }}>view</span>
        </Link>
      </header>
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', position: 'relative', zIndex: 10 }}>
        <Outlet />
      </main>
    </div>
  );
}
