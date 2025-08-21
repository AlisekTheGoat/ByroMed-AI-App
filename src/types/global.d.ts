// Umožní TypeScriptu vědět o window.api skrze preload.
export {};
declare global {
  interface Window {
    api: {
      agent: {
        run(input: { text?: string; language?: string }): Promise<{ runId: string }>;
        cancel(runId: string): Promise<void>;
        listRuns(): Promise<Array<{ id: string; status: 'running' | 'success' | 'error' | 'canceled'; startedAt: number; finishedAt?: number }>>;
        onEvent(cb: (e: any) => void): () => void;
      };
      auth: {
        login(): Promise<void>;
        logout(): Promise<void>;
        getAccessToken(scopes?: string[]): Promise<string | null>;
        getUser(): Promise<{ sub: string; email?: string; name?: string } | null>;
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
      docs: {
        list(): Promise<Array<{ name: string; path: string; size: number; addedAt: number }>>;
        save(filePaths: string[]): Promise<Array<{ name: string; path: string; size: number; addedAt: number }>>;
        delete(name: string): Promise<boolean>;
        pickAndSave(): Promise<Array<{ name: string; path: string; size: number; addedAt: number }>>;
      };
      calendar: {
        list(): Promise<Array<{
          id: string;
          title: string;
          date: string;
          start?: string;
          end?: string;
          color: "blue" | "green" | "red" | "yellow" | "purple" | "gray";
          notes?: string;
        }>>;
        add(ev: {
          title: string;
          date: string;
          start?: string;
          end?: string;
          color: "blue" | "green" | "red" | "yellow" | "purple" | "gray";
          notes?: string;
        }): Promise<{
          id: string;
          title: string;
          date: string;
          start?: string;
          end?: string;
          color: "blue" | "green" | "red" | "yellow" | "purple" | "gray";
          notes?: string;
        }>;
        update(id: string, patch: Partial<{
          title: string;
          date: string;
          start?: string;
          end?: string;
          color: "blue" | "green" | "red" | "yellow" | "purple" | "gray";
          notes?: string;
        }>): Promise<{
          id: string;
          title: string;
          date: string;
          start?: string;
          end?: string;
          color: "blue" | "green" | "red" | "yellow" | "purple" | "gray";
          notes?: string;
        } | null>;
        delete(id: string): Promise<boolean>;
        upcoming(maxCount?: number): Promise<Array<{
          id: string;
          title: string;
          date: string;
          start?: string;
          end?: string;
          color: "blue" | "green" | "red" | "yellow" | "purple" | "gray";
          notes?: string;
        }>>;
        googleSync(options?: { direction?: "push" | "pull" | "two-way" }): Promise<{ ok: boolean; message: string }>;
      };
      dialog: {
        openFiles(): Promise<string[]>;
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
      };
    };
  }
}
