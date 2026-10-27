'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import {
  clearAdminToken,
  clearUserToken,
  getAdminToken,
  getUserToken,
  setAdminToken,
  setUserToken,
} from '@/lib/authStorage';
import type { User } from '@/lib/types';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'error';

export interface AdminIdentity {
  id: string;
  username: string;
  role: 'super' | 'admin';
  permissions: string[];
  isSuper: boolean;
}

interface AuthContextValue<T> {
  status: AuthStatus;
  session: T | null;
  error: string | null;
  signIn: (token: string, session?: T) => Promise<void>;
  signOut: () => void;
  refresh: () => Promise<void>;
  updateSession: (session: T) => void;
}

interface SessionConfig<T> {
  tokenKey: string;
  endpoint: string;
  admin: boolean;
  getToken: () => string | null;
  setToken: (token: string) => void;
  clearToken: () => void;
}

const USER_CONFIG: SessionConfig<User> = {
  tokenKey: 'tarawing_token',
  endpoint: '/api/auth/me',
  admin: false,
  getToken: getUserToken,
  setToken: setUserToken,
  clearToken: clearUserToken,
};

const ADMIN_CONFIG: SessionConfig<AdminIdentity> = {
  tokenKey: 'tarawing_admin_token',
  endpoint: '/api/admin/me',
  admin: true,
  getToken: getAdminToken,
  setToken: setAdminToken,
  clearToken: clearAdminToken,
};

const UserAuthContext = createContext<AuthContextValue<User> | undefined>(undefined);
const AdminAuthContext = createContext<AuthContextValue<AdminIdentity> | undefined>(undefined);

function useSession<T>(config: SessionConfig<T>): AuthContextValue<T> {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const token = config.getToken();
    if (!token) {
      setSession(null);
      setError(null);
      setStatus('anonymous');
      return;
    }

    try {
      const nextSession = await api.get<T>(config.endpoint, config.admin);
      setSession(nextSession);
      setError(null);
      setStatus('authenticated');
    } catch (e) {
      if (e instanceof ApiError && [401, 403].includes(e.status)) {
        config.clearToken();
        setSession(null);
        setError(null);
        setStatus('anonymous');
        return;
      }

      setSession(null);
      setError(e instanceof ApiError ? e.message : 'Could not verify this session.');
      setStatus('error');
    }
  }, [config]);

  useEffect(() => {
    void refresh();

    function handleStorage(event: StorageEvent) {
      if (event.key === config.tokenKey) void refresh();
    }

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [config.tokenKey, refresh]);

  const signIn = useCallback(async (token: string, nextSession?: T) => {
    config.setToken(token);
    setError(null);

    if (nextSession) {
      setSession(nextSession);
      setStatus('authenticated');
      return;
    }

    setStatus('loading');
    try {
      const loadedSession = await api.get<T>(config.endpoint, config.admin);
      setSession(loadedSession);
      setStatus('authenticated');
    } catch (e) {
      config.clearToken();
      setSession(null);
      setStatus('anonymous');
      throw e;
    }
  }, [config]);

  const signOut = useCallback(() => {
    config.clearToken();
    setSession(null);
    setError(null);
    setStatus('anonymous');
  }, [config]);

  const updateSession = useCallback((nextSession: T) => {
    setSession(nextSession);
    setStatus('authenticated');
  }, []);

  return useMemo(() => ({
    status,
    session,
    error,
    signIn,
    signOut,
    refresh,
    updateSession,
  }), [error, refresh, session, signIn, signOut, status, updateSession]);
}

export function UserAuthProvider({ children }: { children: React.ReactNode }) {
  const value = useSession(USER_CONFIG);
  return <UserAuthContext.Provider value={value}>{children}</UserAuthContext.Provider>;
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const value = useSession(ADMIN_CONFIG);
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useUserAuth() {
  const value = useContext(UserAuthContext);
  if (!value) throw new Error('useUserAuth must be used inside UserAuthProvider');
  return value;
}

export function useAdminAuth() {
  const value = useContext(AdminAuthContext);
  if (!value) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return value;
}

export function hasPerm(admin: AdminIdentity | null, domain: string) {
  if (!admin) return false;
  return admin.isSuper || admin.permissions.includes(domain);
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { status, error, refresh } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'anonymous') router.replace('/admin/login');
  }, [router, status]);

  if (status === 'loading') {
    return <div className="container" style={{ paddingTop: 60 }}><p className="form-note">Checking credentials...</p></div>;
  }
  if (status === 'error') {
    return (
      <div className="container" style={{ paddingTop: 60 }}>
        <p className="form-error">{error}</p>
        <button className="btn btn-ghost" onClick={() => refresh()}>Try again</button>
      </div>
    );
  }
  if (status !== 'authenticated') return null;
  return <>{children}</>;
}
