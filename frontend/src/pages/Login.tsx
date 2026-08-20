import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { login } from '../api/auth.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const from = location.state?.from?.pathname || '/admin';

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      navigate(from, { replace: true });
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || 'Login failed');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    loginMutation.mutate({ email, password });
  };

  return (
    <div style={{ width: '100%', maxWidth: '450px', background: 'rgba(0, 0, 0, 0.75)', padding: '4rem 3rem', borderRadius: '0.5rem', color: 'white' }}>
      <h1 style={{ marginBottom: '2rem', fontSize: '2rem', fontWeight: 'bold' }}>Sign In</h1>
      {errorMsg && (
        <div style={{ background: 'var(--color-error)', color: 'white', padding: '1rem', borderRadius: '0.25rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          {errorMsg}
        </div>
      )}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <Input 
          type="email" 
          placeholder="Email address"
          required 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          style={{ background: '#333', color: 'white', border: 'none', padding: '1rem' }}
        />
        <Input 
          type="password" 
          placeholder="Password"
          required 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          style={{ background: '#333', color: 'white', border: 'none', padding: '1rem' }}
        />
        <Button 
          type="submit" 
          style={{ marginTop: '1rem', padding: '1rem', fontSize: '1rem', borderRadius: '0.25rem' }} 
          isLoading={loginMutation.isPending}
        >
          Sign In
        </Button>
      </form>
    </div>
  );
}
