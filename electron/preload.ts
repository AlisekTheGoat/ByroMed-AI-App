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
  dialog: {
    openFiles() {
      return ipcRenderer.invoke("dialog:openFiles") as Promise<string[]>;
    },
  },
});
