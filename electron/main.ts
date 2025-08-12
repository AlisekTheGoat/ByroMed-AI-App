import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";
import { spawn } from "node:child_process";

let win: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === "development";

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

  if (isDev) {
    await win.loadURL("http://localhost:5173"); // Vite dev server
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    await win.loadFile(join(__dirname, "../renderer/index.html"));
  }
};

// ... zbytek (IPC agent:run/cancel) beze změn ...
