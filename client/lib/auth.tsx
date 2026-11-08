'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
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

function getJwtExpiryMs(token: string | null) {
  if (!token) return null;

  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const parsed = JSON.parse(window.atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='))) as {
      exp?: unknown;
    };
    return typeof parsed.exp === 'number' ? parsed.exp * 1000 : null;
  } catch {
    return null;
  }
}

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

  useEffect(() => {
    if (status !== 'authenticated') return;

    let timer: number | undefined;
    const checkExpiry = () => {
      const expiresAt = getJwtExpiryMs(config.getToken());
      if (!expiresAt) return;

      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        config.clearToken();
        setSession(null);
        setError(null);
        setStatus('anonymous');
        return;
      }

      timer = window.setTimeout(checkExpiry, Math.min(remaining, 2_147_000_000));
    };

    checkExpiry();
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [config, status]);

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

type CrossRoleStatus = 'idle' | 'checking' | 'none' | 'user';

export function AdminAccessGate({ children }: { children: React.ReactNode }) {
  const { status: adminStatus, refresh } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();
  const previousPathname = useRef(pathname);
  const [crossRoleStatus, setCrossRoleStatus] = useState<CrossRoleStatus>('idle');

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    if (adminStatus === 'authenticated') void refresh();
  }, [adminStatus, pathname, refresh]);

  useEffect(() => {
    if (adminStatus === 'authenticated') {
      setCrossRoleStatus('idle');
      if (pathname === '/admin/login') router.replace('/admin');
      return;
    }
    if (adminStatus !== 'anonymous') return;

    const userToken = getUserToken();
    if (!userToken) {
      setCrossRoleStatus('none');
      if (pathname !== '/admin/login') router.replace('/admin/login');
      return;
    }

    let active = true;
    setCrossRoleStatus('checking');
    api.get<User>('/api/auth/me')
      .then(() => {
        if (!active) return;
        setCrossRoleStatus('user');
        router.replace('/');
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof ApiError && [401, 403].includes(error.status)) {
          clearUserToken();
        }
        setCrossRoleStatus('none');
        if (pathname !== '/admin/login') router.replace('/admin/login');
      });

    return () => {
      active = false;
    };
  }, [adminStatus, pathname, router]);

  const checking = (
    <div className="container" style={{ paddingTop: 60 }}>
      <p className="form-note">Checking access...</p>
    </div>
  );

  if (adminStatus === 'loading') return checking;
  if (adminStatus === 'authenticated') {
    return pathname === '/admin/login' ? checking : <>{children}</>;
  }
  if (adminStatus === 'anonymous') {
    if (crossRoleStatus === 'idle' || crossRoleStatus === 'checking') return checking;
    if (crossRoleStatus === 'user') return null;
    return pathname === '/admin/login' ? <>{children}</> : checking;
  }
  return <>{children}</>;
}

export function UserWorkspaceGuard({ children }: { children: React.ReactNode }) {
  const { status: adminStatus } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (adminStatus === 'authenticated') router.replace('/');
  }, [adminStatus, router]);

  if (adminStatus === 'loading') {
    return (
      <div className="container" style={{ paddingTop: 50 }}>
        <p className="form-note">Checking workspace access...</p>
      </div>
    );
  }
  if (adminStatus === 'authenticated') return null;
  return <>{children}</>;
}
