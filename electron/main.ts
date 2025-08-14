import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { spawn, ChildProcessWithoutNullStreams } from "node:child_process";
import { getPrisma } from "./prisma";
import { ensurePrismaEnv } from "./db-path";

ensurePrismaEnv();

let win: BrowserWindow | null = null;
const isDev = process.env.NODE_ENV === "development";

// ------------------------------------------------------------------------------------
// Window helpers
// ------------------------------------------------------------------------------------
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

  win.on("closed", () => {
    win = null;
  });

  if (isDev) {
    await getWin().loadURL("http://localhost:5173");
    getWin().webContents.openDevTools({ mode: "detach" });
  } else {
    await getWin().loadFile(join(__dirname, "../renderer/index.html"));
  }

  return getWin();
}

app.whenReady().then(createWindow);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ------------------------------------------------------------------------------------
// Agent spawn helpers
// ------------------------------------------------------------------------------------
type AgentTask = {
  id: string;
  kind: string;
  payload?: any;
  patientId?: string;
};

type WorkerMsg = {
  type: "hello" | "event" | "finished" | "error" | "cancelled" | "warning";
  taskId?: string;
  step?: string;
  message?: string;
  progress?: number;
  ts?: number;
  payload?: unknown;
};

const runsByTask = new Map<
  string,
  { runId: string; child: ChildProcessWithoutNullStreams }
>();

function getPythonCmd(): string {
  if (process.env.BYROMED_PY) return process.env.BYROMED_PY!;
  return process.platform === "win32" ? "py" : "python3";
}

/** Najdi cestu k agent/agent.py pro DEV i PROD build. */
function resolveAgentPath(): string {
  if (isDev) {
    // 1) dist root (když spouštíš z dist)
    const p1 = join(app.getAppPath(), "agent", "agent.py");
    // 2) root repa (běžný dev)
    const p2 = join(process.cwd(), "agent", "agent.py");
    if (existsSync(p1)) return p1;
    if (existsSync(p2)) return p2;
    throw new Error("agent/agent.py not found (dev)");
  }
  // Produkce: electron-builder -> extraResources -> process.resourcesPath/agent/agent.py
  const p = join(process.resourcesPath, "agent", "agent.py");
  if (existsSync(p)) return p;

  // Fallback (např. asar.unpacked)
  const p2 = join(app.getAppPath(), "agent", "agent.py");
  if (existsSync(p2)) return p2;

  throw new Error("agent/agent.py not found (prod)");
}

function emitToRenderer(e: WorkerMsg) {
  const w = BrowserWindow.getAllWindows()[0];
  w?.webContents.send("agent:event", e);
}

// ------------------------------------------------------------------------------------
// IPC: agent:run
// ------------------------------------------------------------------------------------
ipcMain.handle("agent:run", async (_evt, task: AgentTask) => {
  const prisma = getPrisma();

  // 1) Založ běh v DB
  const run = await prisma.agentRun.create({
    data: {
      taskId: task.id,
      kind: task.kind,
      patientId: task.patientId ?? null,
      status: "running",
      inputMeta: task,
    },
  });

  // 2) Spawn Python agenta
  const python = getPythonCmd();
  const agentPath = resolveAgentPath();
  const child = spawn(python, ["-u", agentPath], {
    stdio: ["pipe", "pipe", "pipe"],
    cwd: app.getAppPath(),
  });

  runsByTask.set(task.id, { runId: run.id, child });

  // 3) Pošli do UI "started"
  emitToRenderer({
    taskId: task.id,
    type: "event",
    step: "agent.started",
    message: "Agent startuje…",
    progress: 0,
    ts: Date.now(),
  });

  // 4) Čti stdout po řádcích a zapisuj události
  child.stdout.setEncoding("utf8");
  let buf = "";
  child.stdout.on("data", async (chunk: string) => {
    buf += chunk;
    let idx: number;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line) continue;

      try {
        const msg = JSON.parse(line) as WorkerMsg;
        const taskId = msg.taskId ?? task.id;
        const mapping = runsByTask.get(taskId);
        if (!mapping) {
          emitToRenderer({
            ...msg,
            type: msg.type ?? "warning",
            message: (msg.message ?? "") + " (no mapping)",
          });
          continue;
        }
        const { runId } = mapping;

        if (msg.type !== "hello") {
          await prisma.agentEvent.create({
            data: {
              runId,
              ts: new Date(msg.ts ?? Date.now()),
              step: msg.step ?? msg.type,
              message: msg.message ?? null,
              progress: typeof msg.progress === "number" ? msg.progress : null,
            },
          });
        }

        emitToRenderer({ ...msg, taskId });

        if (msg.type === "finished") {
          await prisma.agentRun.update({
            where: { id: runId },
            data: {
              status: "ok",
              finishedAt: new Date(),
              resultMeta: msg.payload ?? {},
            },
          });
          runsByTask.delete(taskId);
        } else if (msg.type === "error" || msg.type === "cancelled") {
          await prisma.agentRun.update({
            where: { id: runId },
            data: {
              status: msg.type === "error" ? "error" : "cancelled",
              finishedAt: new Date(),
              errorMessage: msg.message ?? null,
              resultMeta: msg.payload ?? {},
            },
          });
          runsByTask.delete(taskId);
        }
      } catch {
        emitToRenderer({
          taskId: task.id,
          type: "warning",
          step: "worker.parse",
          message: "Nelze parsovat výstup agenta",
          ts: Date.now(),
        });
      }
    }
  });

  // 5) STDERR → warning do UI
  child.stderr.on("data", (d: Buffer) => {
    emitToRenderer({
      taskId: task.id,
      type: "warning",
      step: "agent.stderr",
      message: d.toString(),
      ts: Date.now(),
    });
  });

  // 6) Pošli job do agenta
  child.stdin.write(JSON.stringify({ type: "job", task }) + "\n");

  return { ok: true, runId: run.id };
});

// ------------------------------------------------------------------------------------
// IPC: agent:cancel
// ------------------------------------------------------------------------------------
ipcMain.handle("agent:cancel", async (_evt, taskId: string) => {
  const mapping = runsByTask.get(taskId);
  if (mapping) {
    mapping.child.kill("SIGTERM");
    runsByTask.delete(taskId);
    const prisma = getPrisma();
    await prisma.agentRun.update({
      where: { id: mapping.runId },
      data: {
        status: "cancelled",
        finishedAt: new Date(),
        errorMessage: "Zrušeno uživatelem",
      },
    });
    emitToRenderer({
      taskId,
      type: "cancelled",
      step: "agent.cancelled",
      message: "Zrušeno uživatelem",
      ts: Date.now(),
    });
  }
  return { ok: true };
});

// ------------------------------------------------------------------------------------
// IPC: agent:listRuns
// ------------------------------------------------------------------------------------
ipcMain.handle("agent:listRuns", async (_evt, limit = 20) => {
  const prisma = getPrisma();
  return prisma.agentRun.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
  });
});

// ------------------------------------------------------------------------------------
// IPC: dialog:openFiles (audio / dokumenty)
// ------------------------------------------------------------------------------------
ipcMain.handle(
  "dialog:openFiles",
  async (_evt, args: { type: "audio" | "doc" }) => {
    const w = BrowserWindow.getAllWindows()[0];
    const filters =
      args.type === "audio"
        ? [{ name: "Audio", extensions: ["wav", "mp3", "m4a", "ogg"] }]
        : [
            {
              name: "Dokumenty",
              extensions: ["pdf", "png", "jpg", "jpeg", "webp", "tiff"],
            },
          ];

    const res = await dialog.showOpenDialog(w!, {
      properties: ["openFile", "multiSelections"],
      filters,
    });
    return res.canceled ? [] : res.filePaths;
  }
);
