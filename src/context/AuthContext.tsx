'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Action, Feature, PermissionMap, hasPermissionIn, canAccessMenuIn, isSuperAdmin } from '@/lib/rbac';

/**
 * Session shape returned by /api/auth/login and /api/auth/session.
 * There is intentionally NO default user: before this fix `login()` assigned a
 * hardcoded SUPERADMIN object, which is why every account behaved like
 * superadmin (item 15).
 */
export interface UserSession {
  id: number;
  username: string;
  name: string;
  role: string;
  roleName: string;
  division: string;
  divisionCode: string;
  permissions: PermissionMap;
}

interface AuthContextType {
  user: UserSession | null;
  /** null-ish safe: empty string when logged out, never a privileged role. */
  role: string;
  division: string | null;
  loading: boolean;
  login: (u: UserSession) => void;
  logout: () => Promise<void>;
  can: (feature: Feature | string, action: Action) => boolean;
  canAccess: (feature: Feature | string) => boolean;
  isSuperAdmin: boolean;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Restore session from the HttpOnly cookie on first mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/session', { credentials: 'same-origin' });
        if (!res.ok) {
          if (!cancelled) setUser(null);
          return;
        }
        const data = await res.json();
        if (!cancelled) setUser(data);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep tabs in sync: another tab logging out logs this one out too.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'itis_user_logout') setUser(null);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const login = useCallback((u: UserSession) => {
    setUser(u);
    // Convenience mirror for SSR/debug only — the HttpOnly cookie remains the
    // authoritative credential for the server.
    try {
      localStorage.setItem('itis_user', JSON.stringify(u));
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/session', { method: 'DELETE', credentials: 'same-origin' });
    } catch {
      /* ignore network error, clear locally anyway */
    }
    setUser(null);
    try {
      localStorage.removeItem('itis_user');
      localStorage.setItem('itis_user_logout', String(Date.now()));
    } catch {
      /* ignore */
    }
    router.push('/login');
  }, [router]);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/auth/session', { credentials: 'same-origin' });
    setUser(res.ok ? await res.json() : null);
  }, []);

  const can = useCallback(
    (feature: Feature | string, action: Action): boolean => {
      if (!user) return false;
      if (isSuperAdmin(user.role)) return true;
      return hasPermissionIn(user.permissions, feature, action);
    },
    [user],
  );

  const canAccess = useCallback(
    (feature: Feature | string): boolean => {
      if (!user) return false;
      if (isSuperAdmin(user.role)) return true;
      return canAccessMenuIn(user.permissions, feature);
    },
    [user],
  );

  const apiFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(options.headers || {});
      if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      return fetch(url, {
        ...options,
        headers,
        credentials: 'same-origin',
      });
    },
    [],
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      role: user?.role ?? '',
      division: user?.division ?? null,
      loading,
      login,
      logout,
      can,
      canAccess,
      isSuperAdmin: !!user && isSuperAdmin(user.role),
      apiFetch,
      refresh,
    }),
    [user, loading, login, logout, can, canAccess, apiFetch, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}