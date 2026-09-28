'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Role, Feature, Action, hasPermission, canAccessMenu } from '@/lib/rbac';
import { DEMO_USERS, UserSession } from '@/lib/auth';

interface AuthContextType {
  user: UserSession | null;
  role: Role;
  login: (username: string, role?: Role) => void;
  switchRole: (role: Role) => void;
  logout: () => void;
  can: (feature: Feature, action: Action) => boolean;
  canAccess: (feature: Feature) => boolean;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(DEMO_USERS[0]); // default SuperAdmin

  useEffect(() => {
    const saved = localStorage.getItem('itis_user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        setUser(DEMO_USERS[0]);
      }
    }
  }, []);

  const login = (username: string, forceRole?: Role) => {
    const found = DEMO_USERS.find(
      (u) => u.username === username || (forceRole && u.role === forceRole)
    ) || {
      id: 99,
      username,
      name: username,
      role: forceRole || 'STAFF',
    };
    setUser(found);
    localStorage.setItem('itis_user', JSON.stringify(found));
  };

  const switchRole = (newRole: Role) => {
    const target = DEMO_USERS.find((u) => u.role === newRole) || {
      id: 99,
      username: newRole.toLowerCase(),
      name: `${newRole} User`,
      role: newRole,
    };
    setUser(target);
    localStorage.setItem('itis_user', JSON.stringify(target));
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

  // Helper to send auth header with every API request
  const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };
    if (user) {
      headers['x-user'] = user.username;
    }
    return fetch(url, { ...options, headers });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : 'STAFF',
        login,
        switchRole,
        logout,
        can,
        canAccess,
        apiFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
