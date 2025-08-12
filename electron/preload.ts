import { contextBridge, ipcRenderer } from "electron";

type Unsubscribe = () => void;

const api = {
  runAgent: (task: any) => ipcRenderer.invoke("agent:run", task),
  cancelAgent: (taskId: string) => ipcRenderer.invoke("agent:cancel", taskId),

  onAgentEvent: (cb: (e: any) => void): Unsubscribe => {
    const handler = (_: unknown, e: any) => cb(e);
    // Nepoužívej návratovou hodnotu .on (ta je IpcRenderer)
    ipcRenderer.on("agent:event", handler);
    // Vrať čistě cleanup funkci
    return () => {
      ipcRenderer.removeListener("agent:event", handler);
    };
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);
export type ElectronAPI = typeof api;
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
