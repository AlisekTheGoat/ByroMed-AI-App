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
});
