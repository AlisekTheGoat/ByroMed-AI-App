/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH0_DOMAIN?: string;
  readonly VITE_AUTH0_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Types may be missing when pulling from a Git repo version; declare as any to satisfy TS.
declare module '@auth0/auth0-react';

// Minimal typings for Electron preload bridge
declare global {
  interface Window {
    api: {
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
      // Other channels exist but are not strictly typed here to keep it lightweight
      agent: any;
      docs: any;
      calendar: any;
      dialog: any;
    };
  }
}
