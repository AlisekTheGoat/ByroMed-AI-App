// electron/main.ts
import { app, BrowserWindow, ipcMain, dialog } from "electron";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import os from "os";
import type { OpenDialogReturnValue, OpenDialogOptions } from "electron";
import {
  getLocalPrisma,
  getNeonPrisma,
  getResolvedNeonClientPath,
} from "./prisma";
// Auth0 removed: no crypto required

// --- pomocné flagy/cesty ---
const IS_DEV = !!process.env.VITE_DEV_SERVER_URL || !app.isPackaged;

// Load .env as early as possible
dotenv.config();

// Vypnout bezpečnostní varování Electronu pouze v DEV režimu
// (zmenší šum v konzoli; v produkci necháváme výchozí chování)
if (IS_DEV) {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";
}

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

// Auth0 integration removed: no login flow in main process

async function createWindow() {
  try {
    const exists = fs.existsSync(PRELOAD_JS);
    console.log(`[main] preload path: ${PRELOAD_JS} (exists=${exists})`);
  } catch (e) {
    console.warn("[main] preload path check failed", e);
  }
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: true,
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: PRELOAD_JS,
      nodeIntegration: false,
      contextIsolation: true,
      // In dev, disable sandbox to avoid edge issues with contextBridge exposure/HMR
      sandbox: IS_DEV ? false : true,
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

// Auth IPC removed

// ---- Profile (Neon/Postgres via Prisma) ----
type ProfileInput = {
  email?: string | null;
  name?: string | null;
  clinicName?: string | null;
  specialty?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  preferences?: Record<string, unknown> | null;
};

// Profiles no longer tied to Auth0; use a local singleton profile key
const LOCAL_AUTH_SUB = "local";

ipcMain.handle("profile:getSelf", async () => {
  const prisma = getNeonPrisma();
  const authSub = LOCAL_AUTH_SUB;
  const p = await prisma.profile.findUnique({ where: { authSub } });
  return p ?? null;
});

ipcMain.handle("profile:upsertSelf", async (_evt, input: ProfileInput) => {
  const prisma = getNeonPrisma();
  const authSub = LOCAL_AUTH_SUB;
  const data: any = { ...input };
  // Normalize undefined -> null for optional fields to satisfy Prisma
  for (const k of Object.keys(data)) if (data[k] === undefined) data[k] = null;
  const p = await prisma.profile.upsert({
    where: { authSub },
    create: { authSub, ...data, updatedAt: new Date() },
    update: { ...data, updatedAt: new Date() },
  });
  return p;
});

// ---- Diagnostics ----
ipcMain.handle("diagnostics:neonPath", async () => {
  try {
    const p = getResolvedNeonClientPath();
    const exists = fs.existsSync(p) || fs.existsSync(p + ".js");
    return { ok: true as const, path: p, exists };
  } catch (e) {
    return {
      ok: false as const,
      error: String(e instanceof Error ? e.message : e),
    };
  }
});

// Placeholder for Google sync (OAuth and API calls to be implemented).
// This endpoint is designed to be extended with real Google Calendar sync logic.
ipcMain.handle(
  "calendar:google:sync",
  async (_evt, _options?: { direction?: "push" | "pull" | "two-way" }) => {
    // TODO: Implement Google OAuth flow and sync logic.
    // Returning a simple acknowledgment for now.
    return { ok: true, message: "Google sync placeholder executed" } as const;
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

// ---- Documents storage (userData/documents) ----
function ensureDocsDir(): string {
  const dir = path.join(app.getPath("userData"), "documents");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

type StoredDoc = {
  name: string;
  path: string;
  size: number;
  addedAt: number;
};

ipcMain.handle("docs:list", async (): Promise<StoredDoc[]> => {
  const dir = ensureDocsDir();
  const files = fs.readdirSync(dir);
  return files.map((name) => {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    return { name, path: p, size: st.size, addedAt: st.mtimeMs };
  });
});

ipcMain.handle(
  "docs:save",
  async (_evt, filePaths: string[]): Promise<StoredDoc[]> => {
    const dir = ensureDocsDir();
    const saved: StoredDoc[] = [];
    for (const src of filePaths || []) {
      try {
        const base = path.basename(src);
        let dest = path.join(dir, base);
        const ext = path.extname(base);
        const nameOnly = path.basename(base, ext);
        let i = 1;
        while (fs.existsSync(dest)) {
          dest = path.join(dir, `${nameOnly} (${i++})${ext}`);
        }
        fs.copyFileSync(src, dest);
        const st = fs.statSync(dest);
        saved.push({
          name: path.basename(dest),
          path: dest,
          size: st.size,
          addedAt: st.mtimeMs,
        });
      } catch (e) {
        console.warn("docs:save failed for", src, e);
      }
    }
    return saved;
  }
);

ipcMain.handle("docs:delete", async (_evt, name: string): Promise<boolean> => {
  const dir = ensureDocsDir();
  const p = path.join(dir, name);
  try {
    if (fs.existsSync(p)) fs.unlinkSync(p);
    return true;
  } catch (e) {
    console.warn("docs:delete failed", name, e);
    return false;
  }
});

// ---- Calendar storage (userData/calendar.json) ----
type CalendarColor = "blue" | "green" | "red" | "yellow" | "purple" | "gray";
type CalendarEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  start?: string; // HH:mm
  end?: string; // HH:mm
  color: CalendarColor;
  notes?: string;
};

function calendarFile(): string {
  const dir = app.getPath("userData");
  return path.join(dir, "calendar.json");
}

function loadCalendar(): CalendarEvent[] {
  try {
    const p = calendarFile();
    if (!fs.existsSync(p)) return [];
    const raw = fs.readFileSync(p, "utf8");
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return data as CalendarEvent[];
  } catch (e) {
    console.warn("calendar: load failed", e);
  }
  return [];
}

function saveCalendar(evts: CalendarEvent[]) {
  try {
    const p = calendarFile();
    fs.writeFileSync(p, JSON.stringify(evts, null, 2), "utf8");
  } catch (e) {
    console.warn("calendar: save failed", e);
  }
}

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

ipcMain.handle("calendar:list", async (): Promise<CalendarEvent[]> => {
  return loadCalendar();
});

ipcMain.handle(
  "calendar:add",
  async (_evt, data: Omit<CalendarEvent, "id">): Promise<CalendarEvent> => {
    const evts = loadCalendar();
    const created: CalendarEvent = { id: genId(), ...data };
    evts.push(created);
    saveCalendar(evts);
    return created;
  }
);

ipcMain.handle(
  "calendar:update",
  async (
    _evt,
    id: string,
    patch: Partial<CalendarEvent>
  ): Promise<CalendarEvent | null> => {
    const evts = loadCalendar();
    const idx = evts.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    evts[idx] = { ...evts[idx], ...patch };
    saveCalendar(evts);
    return evts[idx];
  }
);

ipcMain.handle(
  "calendar:delete",
  async (_evt, id: string): Promise<boolean> => {
    const evts = loadCalendar();
    const next = evts.filter((e) => e.id !== id);
    saveCalendar(next);
    return next.length !== evts.length;
  }
);

ipcMain.handle(
  "calendar:upcoming",
  async (_evt, maxCount: number = 3): Promise<CalendarEvent[]> => {
    const evts = loadCalendar();
    const now = new Date();
    const parsed = evts
      .map((e) => ({
        e,
        dt: new Date(`${e.date}T${e.start || "00:00"}:00`),
      }))
      .filter((x) => !isNaN(x.dt.getTime()) && x.dt >= now)
      .sort((a, b) => a.dt.getTime() - b.dt.getTime())
      .slice(0, Math.max(1, maxCount))
      .map((x) => x.e);
    return parsed;
  }
);

// Note: create the window ONLY in the primary instance (see single instance lock below)

// macOS deep link handler removed (no auth deep-linking)
app.on("open-url", async (event, _url) => {
  event.preventDefault();
});

// Single-instance handling (prevents double windows and handles deep links)
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  // Primary instance only
  app.whenReady().then(async () => {
    await createWindow();
  });

  // When a second instance is launched, just focus the existing window (no deep link handling needed)
  app.on("second-instance", async () => {
    const all = BrowserWindow.getAllWindows();
    if (all.length > 0) {
      const win = all[0];
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
  });
}

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

// ---- Patients (Prisma in main process) ----
type PatientInput = {
  firstName: string;
  lastName: string;
  birthNumber: string;
  dateOfBirth?: Date | null;
  gender: string;
  phone?: string | null;
  email?: string | null;
  insurance?: string | null;
  insuranceCode?: string | null;
  address?: string | null;
  city?: string | null;
  employerOrSchool?: string | null;
  notes?: string | null;
};

ipcMain.handle(
  "patients:list",
  async (_evt, page: number = 1, pageSize: number = 10) => {
    const prisma = getLocalPrisma();
    const skip = Math.max(0, (page - 1) * pageSize);
    const [data, total] = await Promise.all([
      prisma.patient.findMany({
        skip,
        take: pageSize,
        orderBy: { lastName: "asc" },
      }),
      prisma.patient.count(),
    ]);
    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    } as const;
  }
);

ipcMain.handle("patients:get", async (_evt, id: string) => {
  const prisma = getLocalPrisma();
  return prisma.patient.findUnique({ where: { id } });
});

ipcMain.handle("patients:create", async (_evt, input: PatientInput) => {
  const prisma = getLocalPrisma();
  return prisma.patient.create({ data: input });
});

ipcMain.handle(
  "patients:update",
  async (_evt, id: string, patch: Partial<PatientInput>) => {
    const prisma = getLocalPrisma();
    return prisma.patient.update({ where: { id }, data: patch });
  }
);

ipcMain.handle("patients:delete", async (_evt, id: string) => {
  const prisma = getLocalPrisma();
  await prisma.patient.delete({ where: { id } });
  return true as const;
});

// ---- Settings storage (userData/settings.json) ----
type AppSettings = Record<string, any>;

function settingsFile(): string {
  return path.join(app.getPath("userData"), "settings.json");
}

function loadSettings(): AppSettings {
  try {
    const p = settingsFile();
    if (!fs.existsSync(p)) return {};
    const raw = fs.readFileSync(p, "utf8");
    const data = JSON.parse(raw);
    return typeof data === "object" && data ? data : {};
  } catch (e) {
    console.warn("settings: load failed", e);
    return {};
  }
}

function saveSettings(s: AppSettings) {
  try {
    const p = settingsFile();
    fs.writeFileSync(p, JSON.stringify(s, null, 2), "utf8");
  } catch (e) {
    console.warn("settings: save failed", e);
  }
}

ipcMain.handle("settings:get", async () => {
  return loadSettings();
});

ipcMain.handle("settings:set", async (_evt, input: AppSettings) => {
  const current = loadSettings();
  const next = { ...current, ...input };
  saveSettings(next);
  return next;
});
