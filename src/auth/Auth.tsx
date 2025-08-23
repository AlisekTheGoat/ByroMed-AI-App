import React, { createContext, useContext, type ReactNode } from "react";

// Minimal no-auth stub to keep app stable without external auth
export type AuthContextValue = {
  isAuthenticated: boolean;
  user: null | Record<string, unknown>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
};

const defaultAuthValue: AuthContextValue = {
  isAuthenticated: true,
  user: null,
  login: async () => {},
  logout: async () => {},
  loading: false,
};

const AuthContext = createContext<AuthContextValue>(defaultAuthValue);

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={defaultAuthValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
