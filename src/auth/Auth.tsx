import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

// Types
export type AuthUser = { name: string; email?: string } | null;
export type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser;
  login: () => void;
  logout: () => void;
  isMock: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const hasAuth0Env = Boolean(import.meta.env.VITE_AUTH0_DOMAIN && import.meta.env.VITE_AUTH0_CLIENT_ID);

// Mock auth implementation
function useMockAuth(): AuthContextType {
  const [user, setUser] = useState<AuthUser>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('mock_user');
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);
  const login = () => {
    const u = { name: 'Demo Uživatel', email: 'demo@example.com' };
    setUser(u);
    try { localStorage.setItem('mock_user', JSON.stringify(u)); } catch {}
  };
  const logout = () => {
    setUser(null);
    try { localStorage.removeItem('mock_user'); } catch {}
  };
  return { isAuthenticated: !!user, isLoading: false, user, login, logout, isMock: true };
}

// IPC-based Auth0 implementation (PKCE + custom protocol via electron/main.ts)
function IpcAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Helper to fetch user from main (if logged in)
  const refreshUser = async () => {
    try {
      const u = await (window as any).api?.auth?.getUser();
      if (u) setUser({ name: u.name || 'Uživatel', email: u.email });
      return Boolean(u);
    } catch {
      return false;
    }
  };

  useEffect(() => {
    // Initial fetch on mount
    refreshUser();
  }, []);

  useEffect(() => {
    // If we just initiated login, poll briefly for user materialization after redirect
    const flag = (() => {
      try { return sessionStorage.getItem('auth0_redirect'); } catch { return null; }
    })();
    if (!flag) return;
    setIsLoading(true);
    let attempts = 0;
    const h = window.setInterval(async () => {
      attempts++;
      const ok = await refreshUser();
      if (ok || attempts > 60) {
        window.clearInterval(h);
        try { sessionStorage.removeItem('auth0_redirect'); } catch {}
        setIsLoading(false);
      }
    }, 1000);
    return () => window.clearInterval(h);
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    isAuthenticated: !!user,
    isLoading,
    user,
    login: () => {
      if (isLoading) return;
      try { sessionStorage.setItem('auth0_redirect', '1'); } catch {}
      (window as any).api?.auth?.login();
    },
    logout: async () => {
      await (window as any).api?.auth?.logout();
      setUser(null);
    },
    isMock: false,
  }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const hasIpcAuth = typeof window !== 'undefined' && !!(window as any).api?.auth;
  if (hasAuth0Env && hasIpcAuth) {
    return <IpcAuthProvider>{children}</IpcAuthProvider>;
  }
  // Fallback to mock if env missing or IPC not available (e.g., during dev reload)
  const mock = useMockAuth();
  return <AuthContext.Provider value={mock}>{children}</AuthContext.Provider>;
}

function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const mock = useMockAuth();
  return <AuthContext.Provider value={mock}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
