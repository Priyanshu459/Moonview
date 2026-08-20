import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../../contexts/AuthContext.js';
import { ErrorState } from '../states/ErrorState.js';

export function RequireAdmin() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'ADMIN') {
    return <ErrorState title="Access Denied" error={new Error('You must be an administrator to view this page.')} />;
  }

  return <Outlet />;
}
