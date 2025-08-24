/// <reference types="vite/client" />

interface ImportMetaEnv {
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// (Auth0 removed) No external auth modules declared.

// Minimal typings for Electron preload bridge
declare global {
  interface Window {
    api: {
      auth: {
        login(): Promise<{
          isAuthenticated: boolean;
          expiresAt: number | null;
          user: { sub: string; email?: string; name?: string } | null;
        }>;
        logout(): Promise<{ ok: true }>;
        getStatus(): Promise<{
          isAuthenticated: boolean;
          expiresAt: number | null;
          user: { sub: string; email?: string; name?: string } | null;
        }>;
        getAccessToken(scopes?: string[]): Promise<string | null>;
        getUser(): Promise<{ sub: string; email?: string; name?: string } | null>;
        onChanged(cb: (s: {
          isAuthenticated: boolean;
          expiresAt: number | null;
          user: { sub: string; email?: string; name?: string } | null;
        }) => void): () => void;
      };
      patients: {
        list(page?: number, pageSize?: number): Promise<{
          data: Array<any>;
          pagination: { page: number; pageSize: number; total: number; totalPages: number };
        }>;
        get(id: string): Promise<any>;
        create(input: any): Promise<any>;
        update(id: string, patch: any): Promise<any>;
        delete(id: string): Promise<boolean>;
      };
      settings: {
        get(): Promise<Record<string, any>>;
        set(input: Record<string, any>): Promise<Record<string, any>>;
      };
      profile: {
        getSelf(): Promise<{
          id: string;
          authSub: string;
          email?: string | null;
          name?: string | null;
          clinicName?: string | null;
          specialty?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          country?: string | null;
          preferences?: Record<string, unknown> | null;
          createdAt: string | Date;
          updatedAt: string | Date;
        } | null>;
        upsertSelf(input: {
          email?: string | null;
          name?: string | null;
          clinicName?: string | null;
          specialty?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          country?: string | null;
          preferences?: Record<string, unknown> | null;
        }): Promise<{
          id: string;
          authSub: string;
          email?: string | null;
          name?: string | null;
          clinicName?: string | null;
          specialty?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          country?: string | null;
          preferences?: Record<string, unknown> | null;
          createdAt: string | Date;
          updatedAt: string | Date;
        }>;
        onChanged(cb: (p: {
          id: string;
          authSub: string;
          email?: string | null;
          name?: string | null;
          clinicName?: string | null;
          specialty?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          country?: string | null;
          preferences?: Record<string, unknown> | null;
          createdAt: string | Date;
          updatedAt: string | Date;
        }) => void): () => void;
      };
      diagnostics: {
        neonPath(): Promise<
          | { ok: true; path: string; exists: boolean }
          | { ok: false; error: string }
        >;
      };
      // Other channels exist but are not strictly typed here to keep it lightweight
      agent: any;
      docs: any;
      calendar: any;
      dialog: any;
    };
  }
}
