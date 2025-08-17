import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Auth0Provider as Auth0ProviderComp, useAuth0 as useAuth0Hook } from '@auth0/auth0-react';

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

// Real Auth0 implementation wrapper (static import)
function RealAuth0Provider({ children }: { children: React.ReactNode }) {
  if (!hasAuth0Env) return <>{children}</>;
  const domain = import.meta.env.VITE_AUTH0_DOMAIN as string;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID as string;
  const redirectUri = window.location.origin;

  function InnerAuth0Bridge({ children }: { children: React.ReactNode }) {
    const a = useAuth0Hook();
    const value = useMemo<AuthContextType>(() => ({
      isAuthenticated: a.isAuthenticated,
      isLoading: a.isLoading,
      user: a.user ? { name: a.user.name || a.user.nickname || 'Uživatel', email: a.user.email } : null,
      login: () => {
        if (a.isLoading || a.isAuthenticated) return;
        const currentHash = window.location.hash || '#/' ;
        // Remove leading '#'
        const returnTo = currentHash.startsWith('#') ? currentHash.slice(1) : currentHash;
        try { sessionStorage.setItem('auth0_redirect', '1'); } catch {}
        a.loginWithRedirect?.({ appState: { returnTo } });
      },
      logout: () => a.logout?.({ logoutParams: { returnTo: window.location.origin } }),
      isMock: false,
    }), [a.isAuthenticated, a.isLoading, a.user]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  }

  return (
    <Auth0ProviderComp
      domain={domain}
      clientId={clientId}
      authorizationParams={{ redirect_uri: redirectUri }}
      useRefreshTokens={true}
      cacheLocation="localstorage"
      onRedirectCallback={(appState?: { returnTo?: string }) => {
        try { sessionStorage.removeItem('auth0_redirect'); } catch {}
        const target = appState?.returnTo || '/';
        // Remove OAuth query params (?code, ?state) so our router doesn't think we're still processing
        try {
          const newUrl = window.location.origin + (target.startsWith('#') ? target : (target.startsWith('/') ? `#${target}` : `#/${target}`));
          window.history.replaceState({}, document.title, newUrl);
        } catch {}
        // Ensure we land inside HashRouter
        if (target.startsWith('#')) {
          window.location.hash = target;
        } else {
          window.location.hash = target.startsWith('/') ? `#${target}` : `#/${target}`;
        }
      }}
    >
      <InnerAuth0Bridge>{children}</InnerAuth0Bridge>
    </Auth0ProviderComp>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (hasAuth0Env) {
    return <RealAuth0Provider>{children}</RealAuth0Provider>;
  }
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
