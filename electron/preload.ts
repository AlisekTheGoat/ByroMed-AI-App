// electron/preload.ts
import { contextBridge, ipcRenderer } from "electron";

// Pozn.: Držíme typy jednoduché (kompatibilní s tvým src/types.ts)
type AgentLevel = "info" | "success" | "warning" | "error";
type AgentStep =
  | "hello"
  | "router"
  | "asr.check"
  | "asr.transcribe"
  | "ocr.check"
  | "ocr.parse"
  | "templating"
  | "export"
  | "finished"
  | "error"
  | "canceled";

export type AgentEvent = {
  id: string;
  runId: string;
  ts: number;
  step: AgentStep;
  level: AgentLevel;
  message: string;
  progress?: number;
  payload?: Record<string, unknown>;
};

export type AgentRunSummary = {
  id: string;
  status: "running" | "success" | "error" | "canceled";
  startedAt: number;
  finishedAt?: number;
  title?: string;
};

function onEvent(cb: (e: AgentEvent) => void) {
  const channel = "agent:event";
  const handler = (_: Electron.IpcRendererEvent, ev: AgentEvent) => cb(ev);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

contextBridge.exposeInMainWorld("api", {
  agent: {
    run(input: { text?: string; language?: string }) {
      return ipcRenderer.invoke("agent:run", input) as Promise<{
        runId: string;
      }>;
    },
    cancel(runId: string) {
      return ipcRenderer.invoke("agent:cancel", runId) as Promise<void>;
    },
    listRuns() {
      return ipcRenderer.invoke("agent:listRuns") as Promise<AgentRunSummary[]>;
    },
    onEvent,
  },
  patients: {
    list(page: number = 1, pageSize: number = 10) {
      return ipcRenderer.invoke("patients:list", page, pageSize) as Promise<{
        data: Array<any>;
        pagination: { page: number; pageSize: number; total: number; totalPages: number };
      }>;
    },
    get(id: string) {
      return ipcRenderer.invoke("patients:get", id) as Promise<any>;
    },
    create(input: any) {
      return ipcRenderer.invoke("patients:create", input) as Promise<any>;
    },
    update(id: string, patch: any) {
      return ipcRenderer.invoke("patients:update", id, patch) as Promise<any>;
    },
    delete(id: string) {
      return ipcRenderer.invoke("patients:delete", id) as Promise<boolean>;
    },
  },
  settings: {
    get() {
      return ipcRenderer.invoke("settings:get") as Promise<Record<string, any>>;
    },
    set(input: Record<string, any>) {
      return ipcRenderer.invoke("settings:set", input) as Promise<Record<string, any>>;
    },
  },
  docs: {
    list() {
      return ipcRenderer.invoke("docs:list") as Promise<{
        name: string; path: string; size: number; addedAt: number;
      }[]>;
    },
    save(filePaths: string[]) {
      return ipcRenderer.invoke("docs:save", filePaths) as Promise<{
        name: string; path: string; size: number; addedAt: number;
      }[]>;
    },
    delete(name: string) {
      return ipcRenderer.invoke("docs:delete", name) as Promise<boolean>;
    },
    async pickAndSave() {
      const paths = (await ipcRenderer.invoke("dialog:openFiles")) as string[];
      if (!paths || paths.length === 0) return [] as Array<{name:string;path:string;size:number;addedAt:number}>;
      return ipcRenderer.invoke("docs:save", paths) as Promise<{
        name: string; path: string; size: number; addedAt: number;
      }[]>;
    },
  },
  calendar: {
    list() {
      return ipcRenderer.invoke("calendar:list") as Promise<
        Array<{
          id: string;
          title: string;
          date: string;
          start?: string;
          end?: string;
          color: "blue" | "green" | "red" | "yellow" | "purple" | "gray";
          notes?: string;
        }>
      >;
    },
    add(ev: {
      title: string;
      date: string;
      start?: string;
      end?: string;
      color: "blue" | "green" | "red" | "yellow" | "purple" | "gray";
      notes?: string;
    }) {
      return ipcRenderer.invoke("calendar:add", ev) as Promise<{
        id: string;
        title: string;
        date: string;
        start?: string;
        end?: string;
        color: "blue" | "green" | "red" | "yellow" | "purple" | "gray";
        notes?: string;
      }>;
    },
    update(id: string, patch: Partial<{
      title: string;
      date: string;
      start?: string;
      end?: string;
      color: "blue" | "green" | "red" | "yellow" | "purple" | "gray";
      notes?: string;
    }>) {
      return ipcRenderer.invoke("calendar:update", id, patch) as Promise<{
        id: string;
        title: string;
        date: string;
        start?: string;
        end?: string;
        color: "blue" | "green" | "red" | "yellow" | "purple" | "gray";
        notes?: string;
      } | null>;
    },
    delete(id: string) {
      return ipcRenderer.invoke("calendar:delete", id) as Promise<boolean>;
    },
    upcoming(maxCount: number = 3) {
      return ipcRenderer.invoke("calendar:upcoming", maxCount) as Promise<
        Array<{
          id: string;
          title: string;
          date: string;
          start?: string;
          end?: string;
          color: "blue" | "green" | "red" | "yellow" | "purple" | "gray";
          notes?: string;
        }>
      >;
    },
    googleSync(options?: { direction?: "push" | "pull" | "two-way" }) {
      return ipcRenderer.invoke("calendar:google:sync", options) as Promise<{
        ok: boolean; message: string;
      }>;
    },
  },
  profile: {
    getSelf() {
      return ipcRenderer.invoke("profile:getSelf") as Promise<{
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
    },
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
    }) {
      return ipcRenderer.invoke("profile:upsertSelf", input) as Promise<{
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
    },
  },
  diagnostics: {
    neonPath() {
      return ipcRenderer.invoke("diagnostics:neonPath") as Promise<
        | { ok: true; path: string; exists: boolean }
        | { ok: false; error: string }
      >;
    },
  },
  dialog: {
    openFiles() {
      return ipcRenderer.invoke("dialog:openFiles") as Promise<string[]>;
    },
  },
});

// Diagnostic: confirm which namespaces are exposed at preload execution time
try {
  // Delay to ensure exposeInMainWorld has executed
  setTimeout(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const keys = Object.keys((window as any).api || {});
    console.log(
      `[preload] api keys: ${JSON.stringify(keys)} | electron=${process.versions.electron} | chrome=${process.versions.chrome}`
    );
  }, 0);
} catch {
  // ignore
}
