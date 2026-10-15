import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, type SignInRequest, type SignUpRequest, type User } from '../api/client';
import { reportError } from '../lib/reportError';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  signIn: (values: SignInRequest) => Promise<void>;
  signUp: (values: SignUpRequest) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const setSession = useCallback((next: User | null) => {
    setUser(next);
    setStatus(next ? 'authenticated' : 'anonymous');
  }, []);

  useEffect(() => {
    let cancelled = false;
    authApi
      .session()
      .then(({ user }) => !cancelled && setSession(user))
      .catch((error: unknown) => {
        if (cancelled) return;
        reportError(error, 'session check');
        setSession(null);
      });
    return () => {
      cancelled = true;
    };
  }, [setSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      signIn: async (values) => setSession((await authApi.signIn(values)).user),
      signUp: async (values) => setSession((await authApi.signUp(values)).user),
      signOut: async () => {
        await authApi.signOut();
        setSession(null);
      },
    }),
    [status, user, setSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
