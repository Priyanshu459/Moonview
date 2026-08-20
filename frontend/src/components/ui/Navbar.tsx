import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { Search, User, Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.js';
import styles from './Navbar.module.css';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header className={`${styles.navbar} ${isScrolled ? styles.scrolled : ''}`}>
        <div className={styles.brandGroup}>
          <Link to="/" className={styles.logo}>
            Moon<span style={{ color: 'var(--color-brand-primary)' }}>view</span>
          </Link>
          <nav className={styles.navLinks}>
            <Link to="/" className={isActive('/') ? styles.active : ''}>Home</Link>
            <Link to="/browse" className={isActive('/browse') ? styles.active : ''}>Browse</Link>
            <Link to="/search" className={isActive('/search') ? styles.active : ''}>Search</Link>
          </nav>
        </div>

        <div className={styles.actions}>
          <Link to="/search" className={styles.iconButton} aria-label="Search">
            <Search size={20} />
          </Link>
          
          <Link to={user ? "/admin" : "/login"} className={styles.iconButton} aria-label={user ? "Profile" : "Log In"}>
            <User size={20} />
          </Link>

          <button 
            className={`${styles.iconButton} ${styles.mobileMenuBtn}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          style={{
            position: 'fixed', inset: 0, top: '70px',
            background: 'var(--color-bg-base)', zIndex: 'var(--z-overlay)',
            display: 'flex', flexDirection: 'column', padding: '2rem', gap: '1.5rem',
            fontSize: '1.25rem', fontWeight: 'bold'
          }}
        >
          <Link to="/" onClick={() => setMobileMenuOpen(false)}>Home</Link>
          <Link to="/browse" onClick={() => setMobileMenuOpen(false)}>Browse</Link>
          <Link to="/search" onClick={() => setMobileMenuOpen(false)}>Search</Link>
          {user ? (
            <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
          ) : (
            <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Log In</Link>
          )}
        </div>
      )}
    </>
  );
}
