import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AuthUser = { sub: string; email?: string; name?: string };

export type AuthContextValue = {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
};

const mockValue: AuthContextValue = {
  isAuthenticated: true,
  user: null,
  login: async () => {},
  logout: async () => {},
  loading: false,
};

const AuthContext = createContext<AuthContextValue>(mockValue);

export function AuthProvider({ children }: { children: ReactNode }) {
  const hasBridge = typeof window !== "undefined" && !!window.api && !!window.api.auth;

  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let mounted = true;

    async function bootstrap() {
      if (!hasBridge) {
        // Fallback: behave like mock
        if (!mounted) return;
        setIsAuthenticated(mockValue.isAuthenticated);
        setUser(mockValue.user as AuthUser | null);
        setLoading(false);
        return;
      }
      try {
        const status = await window.api.auth.getStatus();
        if (!mounted) return;
        setIsAuthenticated(!!status?.isAuthenticated);
        setUser(status?.user ?? null);
      } catch (e) {
        // Keep unauthenticated on error
        if (mounted) {
          setIsAuthenticated(false);
          setUser(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }

      // Subscribe to changes
      unsubscribe = window.api.auth.onChanged((s) => {
        setIsAuthenticated(!!s?.isAuthenticated);
        setUser(s?.user ?? null);
      });
    }

    bootstrap();
    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [hasBridge]);

  const value = useMemo<AuthContextValue>(() => {
    if (!hasBridge) {
      return mockValue;
    }
    return {
      isAuthenticated,
      user,
      loading,
      login: async () => {
        try {
          setLoading(true);
          const s = await window.api.auth.login();
          setIsAuthenticated(!!s?.isAuthenticated);
          setUser(s?.user ?? null);
        } finally {
          setLoading(false);
        }
      },
      logout: async () => {
        try {
          setLoading(true);
          await window.api.auth.logout();
          setIsAuthenticated(false);
          setUser(null);
        } finally {
          setLoading(false);
        }
      },
    };
  }, [hasBridge, isAuthenticated, user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
