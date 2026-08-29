'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch, type AuthUser } from '@/lib/utils';

const TOKEN_KEY = 'wl_studio_token';
const USER_KEY = 'wl_studio_user';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<RegisterResult>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export interface RegisterPayload {
  appName: string;
  name?: string;
  email: string;
  password: string;
  bundleId: string;
}

export interface RegisterResult {
  credentials: {
    clientId: string;
    clientSecret: string;
    bundleId: string;
  };
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem(USER_KEY);
      }
    }
    setLoading(false);
  }, []);

  const persist = useCallback((nextToken: string, nextUser: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiFetch<{ token: string; user: AuthUser }>('/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      persist(data.token, data.user);
    },
    [persist],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const data = await apiFetch<{
        token: string;
        user: AuthUser;
        credentials: RegisterResult['credentials'];
      }>('/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      persist(data.token, data.user);
      return { credentials: data.credentials };
    },
    [persist],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) return;
    const me = await apiFetch<AuthUser>('/v1/auth/me', {}, storedToken);
    localStorage.setItem(USER_KEY, JSON.stringify(me));
    setUser(me);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout, refreshUser }),
    [user, token, loading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
