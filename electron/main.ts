import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";

let win: BrowserWindow | null = null;
const isDev = process.env.NODE_ENV === "development";

function getWin(): BrowserWindow {
  if (!win) throw new Error("No BrowserWindow yet");
  return win;
}

async function createWindow(): Promise<BrowserWindow> {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Když se okno zavře, vrať referenci na null
  win.on("closed", () => {
    win = null;
  });

  if (isDev) {
    await getWin().loadURL("http://localhost:5173"); // Vite dev server
    getWin().webContents.openDevTools({ mode: "detach" });
  } else {
    await getWin().loadFile(join(__dirname, "../renderer/index.html"));
  }

  return getWin();
}

app.whenReady().then(createWindow);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// --- IPC příklad: vždy používej getWin() ---
ipcMain.handle("agent:run", async (_evt, task) => {
  const w = getWin();
  w.webContents.send("agent:event", {
    taskId: task.id,
    type: "started",
    step: "agent.started",
    ts: Date.now(),
  });
  return { ok: true };
});
