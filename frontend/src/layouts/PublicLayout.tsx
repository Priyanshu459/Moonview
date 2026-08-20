import { Outlet } from 'react-router';
import { Navbar } from '../components/ui/Navbar.js';

export function PublicLayout() {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1, paddingBottom: '4rem' }}>
        <Outlet />
      </main>
      <footer style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        &copy; {new Date().getFullYear()} Moonview
      </footer>
    </div>
  );
}
