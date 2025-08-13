import { contextBridge, ipcRenderer } from "electron";

type Unsubscribe = () => void;

type AgentTask = {
  id: string;
  kind: string;          // např. "transcribe_and_fill" | "form_fill" | "ocr_and_summarize"
  patientId?: string;
  payload?: any;         // libovolné doplňky (audioPath, filePaths, templateIds, ...)
};

type AgentEvent = {
  taskId: string;
  type: "hello" | "event" | "finished" | "error" | "cancelled" | "warning";
  step?: string;
  message?: string;
  progress?: number;     // 0..1
  ts?: number;
  payload?: unknown;
};

const agentApi = {
  runAgent: (task: AgentTask) => ipcRenderer.invoke("agent:run", task),
  cancelAgent: (taskId: string) => ipcRenderer.invoke("agent:cancel", taskId),
  listAgentRuns: (limit?: number) => ipcRenderer.invoke("agent:listRuns", limit),

  onAgentEvent: (cb: (e: AgentEvent) => void): Unsubscribe => {
    const handler = (_: unknown, e: AgentEvent) => cb(e);
    ipcRenderer.on("agent:event", handler);
    return () => ipcRenderer.removeListener("agent:event", handler);
  },
};

contextBridge.exposeInMainWorld("electronAPI", agentApi);
export type ElectronAPI = typeof agentApi;

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
