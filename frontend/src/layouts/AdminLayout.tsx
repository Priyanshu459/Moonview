import { Outlet, Link, useNavigate, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext.js';
import { logout } from '../api/auth.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/ui/Button.js';
import { LogOut, LayoutDashboard, Settings, Film, Users, Home } from 'lucide-react';

export function AdminLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(['auth', 'me'], null);
      navigate('/');
    },
  });

  const NavItem = ({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) => {
    const active = location.pathname === to;
    return (
      <Link 
        to={to} 
        style={{ 
          display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', 
          borderRadius: '0.5rem', textDecoration: 'none',
          color: active ? 'white' : 'var(--color-text-secondary)',
          background: active ? 'var(--color-bg-elevated)' : 'transparent',
          transition: 'all var(--transition-fast)'
        }}
      >
        {icon}
        <span style={{ fontWeight: 500 }}>{label}</span>
      </Link>
    );
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', background: 'var(--color-bg-base)' }}>
      <aside style={{ 
        width: '280px', 
        background: '#000', 
        borderRight: '1px solid var(--color-border-subtle)',
        padding: '2rem 1.5rem', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '2rem' 
      }}>
        <div style={{ padding: '0 1rem' }}>
          <Link to="/" style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'white', textDecoration: 'none' }}>
            Moon<span style={{ color: 'var(--color-brand-primary)' }}>view</span> <span style={{ color: 'white', fontSize: '1rem', fontWeight: 'normal' }}>Admin</span>
          </Link>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <NavItem to="/admin" icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <NavItem to="/admin/content" icon={<Film size={20} />} label="Content Management" />
          <NavItem to="/admin/media" icon={<Film size={20} />} label="Media Library" />
          <NavItem to="/admin/taxonomy" icon={<Settings size={20} />} label="Taxonomy" />
          <NavItem to="/admin/users" icon={<Users size={20} />} label="Users" />
          <NavItem to="/admin/settings" icon={<Settings size={20} />} label="Settings" />
        </nav>

        <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: '1.5rem' }}>
          <div style={{ padding: '0 1rem 1rem 1rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            {user?.email}
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <NavItem to="/" icon={<Home size={20} />} label="Back to site" />
            <button 
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', 
                borderRadius: '0.5rem', color: 'var(--color-error)', width: '100%', textAlign: 'left',
                transition: 'background var(--transition-fast)'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <LogOut size={20} />
              <span style={{ fontWeight: 500 }}>{logoutMutation.isPending ? 'Logging out...' : 'Log Out'}</span>
            </button>
          </nav>
        </div>
      </aside>
      
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--color-bg-base)' }}>
        <Outlet />
      </main>
    </div>
  );
}
