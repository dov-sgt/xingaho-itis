'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Role, Feature, Action, hasPermission, canAccessMenu } from '@/lib/rbac';

interface UserSession {
  id: number;
  username: string;
  name: string;
  role: Role;
  division?: string | null;
  vendorId?: number | null;
}

interface AuthContextType {
  user: UserSession | null;
  role: Role;
  division: string | null;
  login: (username: string) => void;
  logout: () => void;
  can: (feature: Feature, action: Action) => boolean;
  canAccess: (feature: Feature) => boolean;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_USER: UserSession = {
  id: 1,
  username: 'superadmin',
  name: 'Sigit SuperAdmin',
  role: 'SUPERADMIN',
  division: null,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('itis_user');
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch (e) { setUser(null); }
    }
  }, []);

  const login = (username: string) => {
    setUser(DEFAULT_USER);
    localStorage.setItem('itis_user', JSON.stringify(DEFAULT_USER));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('itis_user');
  };

  const can = (feature: Feature, action: Action): boolean => {
    if (!user) return false;
    return hasPermission(user.role, feature, action);
  };

  const canAccess = (feature: Feature): boolean => {
    if (!user) return false;
    return canAccessMenu(user.role, feature);
  };

  const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
    if (user) headers['x-user'] = user.username;
    return fetch(url, { ...options, headers });
  };

  return (
    <AuthContext.Provider value={{ user, role: user ? user.role : 'SUPERADMIN', division: user?.division || null, login, logout, can, canAccess, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
