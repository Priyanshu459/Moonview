import { createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMe } from '../api/auth.js';
import { ApiError } from '../api/client.js';
import type { AuthUserResponse } from '@moonview/shared';

interface AuthContextType {
  user: AuthUserResponse | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading, error } = useQuery<AuthUserResponse, Error>({
    queryKey: ['auth', 'me'],
    queryFn: getMe,
    retry: (failureCount, err) => {
      if (err instanceof ApiError && err.status === 401) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 1000 * 60 * 5,
  });

  // 401 is considered a successful "logged out" state, not an application error
  const isLoggedOut = error instanceof ApiError && error.status === 401;
  const isGenuineError = !!error && !isLoggedOut;

  const value: AuthContextType = {
    user: user ?? null,
    isLoading,
    isError: isGenuineError,
    error: isGenuineError ? error : null,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
