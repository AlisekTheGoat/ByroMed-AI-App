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
    };
  }
}
