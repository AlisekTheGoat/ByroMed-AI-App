// electron/main.ts
import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import fs from "fs";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import os from "os";
import type { OpenDialogReturnValue, OpenDialogOptions } from "electron";

// --- pomocné flagy/cesty ---
const IS_DEV = !!process.env.VITE_DEV_SERVER_URL || !app.isPackaged;

// Kde je preload? (v dev: __dirname = dist/electron; v prod: resources/dist/electron)
const PRELOAD_JS = app.isPackaged
  ? path.join(process.resourcesPath, "dist", "electron", "preload.js")
  : path.join(__dirname, "preload.js");

// Najdi buildnutý renderer index.html (prod fallback)
function resolveRendererIndex(): string {
  const candidates = [
    // běžné build umístění
    path.join(process.cwd(), "dist", "renderer", "index.html"),
    // když se main.js spouští z dist/electron
    path.join(__dirname, "..", "renderer", "index.html"),
    // balíček (resourcesPath)
    path.join(process.resourcesPath, "dist", "renderer", "index.html"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(
    `Renderer index.html nebyl nalezen.\nHledal jsem:\n${candidates
      .map((p) => " - " + p)
      .join("\n")}\n` +
      `Tipy: 1) Dev: spusť Vite a nastav VITE_DEV_SERVER_URL, 2) Prod: nejdřív buildni renderer (vite build).`
  );
}

type AgentStatus = "running" | "success" | "error" | "canceled";
type RunRecord = {
  id: string;
  status: AgentStatus;
  startedAt: number;
  finishedAt?: number;
  child?: ChildProcessWithoutNullStreams;
};
type AgentEvent = {
  id: string;
  runId: string;
  ts: number;
  step:
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
  level: "info" | "success" | "warning" | "error";
  message: string;
  progress?: number;
  payload?: Record<string, unknown>;
};

const runs = new Map<string, RunRecord>();
const rid = () => Math.random().toString(36).slice(2, 10);
const pythonCmd = () =>
  process.env.BYROMED_PYTHON_BIN ||
  (os.platform() === "win32" ? "python" : "python3");
const agentPath = () =>
  app.isPackaged
    ? path.join(process.resourcesPath, "agent", "agent.py")
    : path.join(process.cwd(), "agent", "agent.py");

function broadcast(ev: AgentEvent) {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send("agent:event", ev);
  }
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true,
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: PRELOAD_JS,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });

  // Diagnostika načítání
  win.webContents.on("did-fail-load", (_e, code, desc, url) => {
    console.error("did-fail-load:", code, desc, url);
  });
  win.webContents.on(
    "console-message",
    (_e, level, message, line, sourceId) => {
      console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`);
    }
  );

  const devUrlRaw = process.env.VITE_DEV_SERVER_URL; // např. http://localhost:5173
  const devUrl = devUrlRaw
    ? devUrlRaw.endsWith("/")
      ? devUrlRaw
      : devUrlRaw + "/"
    : null;

  try {
    if (devUrl) {
      // DEV: explicitně načti index.html (zabrání 404 na rootu)
      await win.loadURL(devUrl + "index.html");
      win.webContents.openDevTools({ mode: "detach" });
    } else {
      // PROD: načti build
      const indexFile = resolveRendererIndex();
      await win.loadFile(indexFile);
    }
  } catch (err) {
    console.error("Renderer load failed:", err);
    // Zobraz okno s chybou (užitečné při packagi)
    await win.loadURL(
      "data:text/plain;charset=UTF-8," +
        encodeURIComponent(
          "Nepodařilo se načíst renderer.\n\n" +
            String(err instanceof Error ? err.message : err)
        )
    );
  }
}

// --- Python worker piping ---
function setupChildPipe(runId: string, child: ChildProcessWithoutNullStreams) {
  let buf = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    buf += chunk;
    let idx: number;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const raw = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!raw) continue;
      try {
        const msg = JSON.parse(raw);
        const ev: AgentEvent = {
          id: msg.id || rid(),
          runId,
          ts: Date.now(),
          step: msg.step,
          level: msg.level || "info",
          message: msg.message || "",
          progress: typeof msg.progress === "number" ? msg.progress : undefined,
          payload: msg.payload,
        };
        broadcast(ev);
        if (ev.step === "finished" || ev.step === "error") {
          const rec = runs.get(runId);
          if (rec) {
            rec.status = ev.step === "finished" ? "success" : "error";
            rec.finishedAt = Date.now();
            runs.set(runId, rec);
          }
        }
      } catch {
        console.error("Invalid agent line:", raw);
      }
    }
  });

  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) =>
    console.warn("[agent stderr]", chunk)
  );

  child.on("exit", (code, signal) => {
    const rec = runs.get(runId);
    if (!rec) return;
    if (rec.status === "running") {
      rec.status = "error";
      rec.finishedAt = Date.now();
      runs.set(runId, rec);
      broadcast({
        id: rid(),
        runId,
        ts: Date.now(),
        step: signal === "SIGTERM" ? "canceled" : "error",
        level: signal === "SIGTERM" ? "warning" : "error",
        message:
          signal === "SIGTERM"
            ? "Běh zrušen uživatelem."
            : `Agent ukončen (code=${code}, signal=${signal ?? "none"})`,
      });
    }
  });
}

function startAgent(
  runId: string,
  input: { text?: string; language?: string }
) {
  const child = spawn(pythonCmd(), [agentPath()], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, BYROMED_RUN_ID: runId },
  });
  setupChildPipe(runId, child);
  child.stdin.write(
    JSON.stringify({
      runId,
      text: input.text ?? null,
      language: input.language ?? "auto",
    }) + "\n"
  );
  child.stdin.end();
  runs.set(runId, {
    id: runId,
    status: "running",
    startedAt: Date.now(),
    child,
  });
  return child;
}

// --- IPC ---
ipcMain.handle(
  "agent:run",
  async (_evt, input: { text?: string; language?: string }) => {
    const runId = rid();
    startAgent(runId, input ?? {});
    return { runId };
  }
);

ipcMain.handle("agent:cancel", async (_evt, runId: string) => {
  const rec = runs.get(runId);
  if (!rec?.child) return;
  try {
    rec.child.kill("SIGTERM");
    rec.status = "canceled";
    rec.finishedAt = Date.now();
    runs.set(runId, rec);
    broadcast({
      id: rid(),
      runId,
      ts: Date.now(),
      step: "canceled",
      level: "warning",
      message: "Běh zrušen uživatelem.",
    });
  } catch (e) {
    console.warn("Cancel failed", e);
  }
});

ipcMain.handle("agent:listRuns", async () =>
  Array.from(runs.values()).map((r) => ({
    id: r.id,
    status: r.status,
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
  }))
);

ipcMain.handle("dialog:openFiles", async (): Promise<string[]> => {
  const options: OpenDialogOptions = {
    properties: ["openFile", "multiSelections"],
    filters: [
      {
        name: "Podporované",
        extensions: [
          "mp3",
          "wav",
          "m4a",
          "aac",
          "ogg",
          "pdf",
          "png",
          "jpg",
          "jpeg",
          "webp",
        ],
      },
    ],
  };

  const result: OpenDialogReturnValue = await dialog.showOpenDialog(options);
  return result.canceled ? [] : result.filePaths;
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) await createWindow();
});

// Zachytávání neodchycených promise (zabrání UnhandledPromiseRejectionWarning)
process.on("unhandledRejection", (reason) => {
  console.error("UnhandledRejection:", reason);
});
