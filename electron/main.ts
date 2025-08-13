import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";
import { getPrisma } from "./prisma";
import { ensurePrismaEnv } from "./db-path";
import { spawn, ChildProcessWithoutNullStreams } from "node:child_process";

ensurePrismaEnv();

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

// ---------- Agent: typy a pomocníci ----------
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

// child procesy a mapování taskId -> runId/child
const runsByTask = new Map<
  string,
  { runId: string; child: ChildProcessWithoutNullStreams }
>();

// Získání cesty k Pythonu (dev: python3 na mac/linux, py na Win; možnost přepsat env proměnnou BYROMED_PY)
function getPythonCmd(): string {
  if (process.env.BYROMED_PY) return process.env.BYROMED_PY;
  return process.platform === "win32" ? "py" : "python3";
}

// Bezpečné posílání eventu do rendereru
function emitToRenderer(e: WorkerMsg) {
  const w = BrowserWindow.getAllWindows()[0];
  w?.webContents.send("agent:event", e);
}

// ---------- IPC: spustit agenta ----------
ipcMain.handle("agent:run", async (_evt, task: AgentTask) => {
  const prisma = getPrisma();

  // 1) Založ běh v DB
  const run = await prisma.agentRun.create({
    data: {
      taskId: task.id,
      kind: task.kind,
      patientId: task.patientId ?? null,
      status: "running",
      inputMeta: task, // uložíme celé zadání pro audit
    },
  });

  // 2) Spawn Python workeru
  const python = getPythonCmd();
  const workerPath = join(app.getAppPath(), "worker", "worker.py");
  const child = spawn(python, ["-u", workerPath], {
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

  // 4) Stream stdout řádek po řádku
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

        // HELLO neukládáme, ostatní eventy ano
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

        // Pošli do UI
        emitToRenderer({ ...msg, taskId });

        // Dokončení běhu
        if (msg.type === "finished") {
          await prisma.agentRun.update({
            where: { id: runId },
            data: {
              status: "ok",
              finishedAt: new Date(),
              resultMeta: msg.payload ?? null,
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
              resultMeta: msg.payload ?? null,
            },
          });
          runsByTask.delete(taskId);
        }
      } catch (err) {
        // špatná JSON linka – ignoruj, případně pošli warning do UI
        emitToRenderer({
          taskId: task.id,
          type: "warning",
          step: "worker.parse",
          message: "Nelze parsovat výstup workeru",
          ts: Date.now(),
        });
      }
    }
  });

  // 5) STDERR → warning do UI (a případně do logu)
  child.stderr.on("data", (d: Buffer) => {
    emitToRenderer({
      taskId: task.id,
      type: "warning",
      step: "worker.stderr",
      message: d.toString(),
      ts: Date.now(),
    });
  });

  // 6) Pošli job do workeru
  child.stdin.write(JSON.stringify({ type: "job", task }) + "\n");

  return { ok: true, runId: run.id };
});

// ---------- IPC: cancel ----------
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

// ---------- IPC: list posledních běhů (rychlá kontrola) ----------
ipcMain.handle("agent:listRuns", async (_evt, limit = 20) => {
  const prisma = getPrisma();
  return prisma.agentRun.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
  });
});
