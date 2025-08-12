import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";
import { spawn } from "node:child_process";

let win: BrowserWindow | null = null;

const createWindow = async () => {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
    },
  });

  if (process.env.NODE_ENV === "development") {
    await win.loadFile(join(__dirname, "../renderer/index.html"));
  } else {
    await win.loadFile(join(__dirname, "../renderer/index.html"));
  }
};

app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// --- Agent IPC skeleton ---
type AgentTask = { id: string; kind: string; payload?: any };

ipcMain.handle("agent:run", async (_evt, task: AgentTask) => {
  const child = spawn(process.execPath, ["worker/worker.py"], {
    stdio: ["pipe", "pipe", "pipe"],
  });
  // Handshake event to renderer
  win?.webContents.send("agent:event", {
    taskId: task.id,
    type: "started",
    step: "agent.started",
    ts: Date.now(),
  });

  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    chunk
      .toString()
      .split("\n")
      .forEach((line) => {
        if (!line.trim()) return;
        try {
          win?.webContents.send("agent:event", JSON.parse(line));
        } catch {}
      });
  });

  child.stderr.on("data", (d) => {
    console.warn("[worker]", d.toString());
  });

  // send task to worker
  child.stdin.write(JSON.stringify({ type: "job", task }) + "\n");

  return { ok: true };
});

ipcMain.handle("agent:cancel", async (_evt, taskId: string) => {
  // Místo pro AbortController registry – zatím noop
  win?.webContents.send("agent:event", {
    taskId,
    type: "cancelled",
    step: "agent.cancelled",
    ts: Date.now(),
  });
  return { ok: true };
});
