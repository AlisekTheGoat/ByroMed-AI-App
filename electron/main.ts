// electron/main.ts
import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import os from "os";
import crypto from "crypto";
import type { OpenDialogReturnValue, OpenDialogOptions } from "electron";
import {
  getLocalPrisma,
  getNeonPrisma,
  getResolvedNeonClientPath,
} from "./prisma";
// Auth0 PKCE helpers and state

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

// ---- Auth0 PKCE (embedded login, tokens in-memory) ----
type AuthTokens = {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  token_type: string;
  expires_at: number; // epoch ms
  scope?: string;
};

type AuthUser = {
  sub: string;
  email?: string;
  name?: string;
};

let TOKENS: AuthTokens | null = null;
let USER: AuthUser | null = null;
let loginWindow: BrowserWindow | null = null;
let pendingState: string | null = null;
let pendingVerifier: string | null = null;

const AUTH0_DOMAIN = (process.env.VITE_AUTH0_DOMAIN || "").trim();
const AUTH0_CLIENT_ID = (process.env.VITE_AUTH0_CLIENT_ID || "").trim();
const AUTH0_REDIRECT_URI = "byromed://auth/callback"; // intercepted inside embedded window
const AUTH0_SCOPES = "openid profile email offline_access"; // offline_access enables refresh_token
const AUTH0_MGMT_CLIENT_ID = (process.env.AUTH0_MGMT_CLIENT_ID || "").trim();
const AUTH0_MGMT_CLIENT_SECRET = (process.env.AUTH0_MGMT_CLIENT_SECRET || "").trim();
const AUTH0_MGMT_AUDIENCE = `https://${AUTH0_DOMAIN}/api/v2/`;

type MgmtTokens = { access_token: string; expires_at: number };
let MGMT_TOKENS: MgmtTokens | null = null;

async function getMgmtToken(): Promise<string | null> {
  // Optional: only if credentials provided
  if (!AUTH0_DOMAIN || !AUTH0_MGMT_CLIENT_ID || !AUTH0_MGMT_CLIENT_SECRET) return null;
  const now = Date.now() + 30_000;
  if (MGMT_TOKENS && now < MGMT_TOKENS.expires_at) return MGMT_TOKENS.access_token;
  const res = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: AUTH0_MGMT_CLIENT_ID,
      client_secret: AUTH0_MGMT_CLIENT_SECRET,
      audience: AUTH0_MGMT_AUDIENCE,
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.warn("[auth0] mgmt token failed:", res.status, t);
    return null;
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  MGMT_TOKENS = {
    access_token: data.access_token,
    expires_at: Date.now() + Math.max(1, data.expires_in) * 1000,
  };
  return MGMT_TOKENS.access_token;
}

async function auth0GetUserMetadata(authSub: string): Promise<{
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
} | null> {
  const token = await getMgmtToken();
  if (!token) return null;
  const url = `https://${AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(authSub)}?fields=user_metadata,app_metadata&include_fields=true`;
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { user_metadata?: any; app_metadata?: any };
  return { user_metadata: data.user_metadata, app_metadata: data.app_metadata };
}

async function auth0PatchUserMetadata(authSub: string, body: {
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
}): Promise<boolean> {
  const token = await getMgmtToken();
  if (!token) return false;
  const url = `https://${AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(authSub)}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.warn("[auth0] patch metadata failed:", res.status, t);
    return false;
  }
  return true;
}

function cleanPrefs(prefs: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!prefs || typeof prefs !== "object") return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(prefs)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    out[k] = v;
  }
  return Object.keys(out).length ? out : null;
}

async function trySyncAuth0Metadata(authSub: string, prefs: Record<string, unknown> | null | undefined) {
  if (!authSub || authSub === LOCAL_AUTH_SUB) return; // skip local
  const clean = cleanPrefs(prefs ?? null);
  // Push the same preferences under a namespaced key to both user_metadata and app_metadata
  const body = {
    user_metadata: clean ? { preferences: clean } : null,
    app_metadata: clean ? { preferences: clean } : null,
  } as const;
  try {
    await auth0PatchUserMetadata(authSub, body);
  } catch (e) {
    console.warn("[auth0] sync metadata error", e);
  }
}

function b64url(input: Buffer) {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function genCodeVerifier(): string {
  return b64url(crypto.randomBytes(64));
}

function genCodeChallenge(verifier: string): string {
  return b64url(crypto.createHash("sha256").update(verifier).digest());
}

function decodeJwtWithoutVerify<T = Record<string, unknown>>(jwt?: string): T | null {
  if (!jwt) return null;
  const parts = jwt.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1];
    const padded = payload.padEnd(payload.length + (4 - (payload.length % 4)) % 4, "=");
    const json = Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

function isTokenExpired(tok: AuthTokens | null): boolean {
  if (!tok) return true;
  const now = Date.now() + 30_000; // 30s skew
  return now >= tok.expires_at;
}

function broadcastAuthChanged() {
  const status = {
    isAuthenticated: !!TOKENS && !isTokenExpired(TOKENS),
    expiresAt: TOKENS?.expires_at ?? null,
    user: USER,
  } as const;
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send("auth:changed", status);
  }
}

async function exchangeCodeForTokens(code: string, verifier: string): Promise<void> {
  const url = `https://${AUTH0_DOMAIN}/oauth/token`;
  const body = {
    grant_type: "authorization_code",
    client_id: AUTH0_CLIENT_ID,
    code_verifier: verifier,
    code,
    redirect_uri: AUTH0_REDIRECT_URI,
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    id_token?: string;
    refresh_token?: string;
    token_type: string;
    expires_in: number;
    scope?: string;
  };
  const expires_at = Date.now() + (Math.max(1, data.expires_in) * 1000);
  TOKENS = {
    access_token: data.access_token,
    id_token: data.id_token,
    refresh_token: data.refresh_token,
    token_type: data.token_type,
    scope: data.scope,
    expires_at,
  };
  const claims = decodeJwtWithoutVerify<any>(data.id_token);
  USER = claims && typeof claims === "object" && claims.sub ? {
    sub: String(claims.sub),
    email: typeof claims.email === "string" ? claims.email : undefined,
    name: typeof claims.name === "string" ? claims.name : undefined,
  } : null;
}

async function refreshTokensIfNeeded(): Promise<void> {
  if (!TOKENS) return;
  if (!isTokenExpired(TOKENS)) return;
  const rt = TOKENS.refresh_token;
  if (!rt) {
    // No refresh token; force logout
    TOKENS = null;
    USER = null;
    broadcastAuthChanged();
    return;
  }
  const url = `https://${AUTH0_DOMAIN}/oauth/token`;
  const body = {
    grant_type: "refresh_token",
    client_id: AUTH0_CLIENT_ID,
    refresh_token: rt,
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    // Refresh failed; clear session
    TOKENS = null;
    USER = null;
    broadcastAuthChanged();
    return;
  }
  const data = (await res.json()) as {
    access_token: string;
    id_token?: string;
    refresh_token?: string;
    token_type: string;
    expires_in: number;
    scope?: string;
  };
  const expires_at = Date.now() + (Math.max(1, data.expires_in) * 1000);
  TOKENS = {
    access_token: data.access_token,
    id_token: data.id_token ?? TOKENS.id_token,
    refresh_token: data.refresh_token ?? TOKENS.refresh_token,
    token_type: data.token_type,
    scope: data.scope ?? TOKENS.scope,
    expires_at,
  };
  const claims = decodeJwtWithoutVerify<any>(TOKENS.id_token);
  USER = claims && typeof claims === "object" && claims.sub ? {
    sub: String(claims.sub),
    email: typeof claims.email === "string" ? claims.email : undefined,
    name: typeof claims.name === "string" ? claims.name : undefined,
  } : USER;
}

function buildAuthorizeUrl(): string {
  const state = b64url(crypto.randomBytes(16));
  pendingState = state;
  const verifier = genCodeVerifier();
  pendingVerifier = verifier;
  const challenge = genCodeChallenge(verifier);
  const url = new URL(`https://${AUTH0_DOMAIN}/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", AUTH0_CLIENT_ID);
  url.searchParams.set("redirect_uri", AUTH0_REDIRECT_URI);
  url.searchParams.set("scope", AUTH0_SCOPES);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", state);
  // Optional UX tuning
  url.searchParams.set("prompt", "login");
  url.searchParams.set("max_age", "0");
  return url.toString();
}

async function startEmbeddedLogin(): Promise<void> {
  if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID) {
    throw new Error("Auth0 not configured. Set VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID in env.");
  }
  if (loginWindow && !loginWindow.isDestroyed()) {
    try { loginWindow.focus(); } catch {}
    return;
  }
  loginWindow = new BrowserWindow({
    width: 480,
    height: 700,
    modal: false,
    show: true,
    title: "ByroMed – Sign in",
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: PRELOAD_JS,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: IS_DEV ? false : true,
      webSecurity: true,
    },
  });
  // Prevent new windows/popups
  loginWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  // Open external links in default browser (e.g., privacy policy)
  loginWindow.webContents.setWindowOpenHandler((details) => {
    if (details.url && /^(https?:)/i.test(details.url)) {
      shell.openExternal(details.url);
    }
    return { action: "deny" };
  });

  const handleUrl = async (targetUrl: string) => {
    if (!targetUrl.startsWith(AUTH0_REDIRECT_URI)) return;
    try {
      const u = new URL(targetUrl);
      const code = u.searchParams.get("code");
      const state = u.searchParams.get("state");
      if (!code) throw new Error("Missing code in callback");
      if (!state || state !== pendingState) throw new Error("State mismatch");
      const verifier = pendingVerifier;
      pendingVerifier = null;
      pendingState = null;
      if (!verifier) throw new Error("No PKCE verifier in memory");
      await exchangeCodeForTokens(code, verifier);
      broadcastAuthChanged();
    } catch (e) {
      console.error("[auth] callback handling failed:", e);
    } finally {
      if (loginWindow && !loginWindow.isDestroyed()) loginWindow.close();
      loginWindow = null;
    }
  };

  loginWindow.webContents.on("will-redirect", (_e, url) => handleUrl(url));
  loginWindow.webContents.on("will-navigate", (_e, url) => handleUrl(url));
  loginWindow.on("closed", () => {
    loginWindow = null;
  });

  await loginWindow.loadURL(buildAuthorizeUrl());
}

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

// ---- Auth IPC ----
ipcMain.handle("auth:login", async () => {
  await startEmbeddedLogin();
  const status = {
    isAuthenticated: !!TOKENS && !isTokenExpired(TOKENS),
    expiresAt: TOKENS?.expires_at ?? null,
    user: USER,
  } as const;
  return status;
});

ipcMain.handle("auth:logout", async () => {
  TOKENS = null;
  USER = null;
  pendingState = null;
  pendingVerifier = null;
  broadcastAuthChanged();
  return { ok: true } as const;
});

ipcMain.handle("auth:getStatus", async () => {
  await refreshTokensIfNeeded();
  return {
    isAuthenticated: !!TOKENS && !isTokenExpired(TOKENS),
    expiresAt: TOKENS?.expires_at ?? null,
    user: USER,
  } as const;
});

ipcMain.handle("auth:getAccessToken", async () => {
  await refreshTokensIfNeeded();
  if (!TOKENS || isTokenExpired(TOKENS)) return null;
  return TOKENS.access_token;
});

ipcMain.handle("auth:getUser", async () => {
  await refreshTokensIfNeeded();
  return USER;
});

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

// Profiles prefer current Auth0 subject; fallback to local singleton
const LOCAL_AUTH_SUB = "local";
function currentAuthSub(): string {
  return USER?.sub || LOCAL_AUTH_SUB;
}

ipcMain.handle("profile:getSelf", async () => {
  const prisma = getNeonPrisma();
  const authSub = currentAuthSub();
  const u = await prisma.user.findUnique({
    where: { authSub },
    include: { preferences: true },
  });
  if (!u) return null;
  const prefs = u.preferences;
  // Map Neon models to backward-compatible shape expected by renderer
  const base = {
    id: u.authSub,
    authSub: u.authSub,
    email: u.email ?? null,
    name: u.name ?? null,
    clinicName: null,
    specialty: u.specialty ?? null,
    phone: u.phone ?? null,
    address: u.address ?? null,
    city: u.city ?? null,
    country: u.country ?? null,
    preferences: prefs
      ? {
          greetingName: prefs.greetingName ?? undefined,
          specialization: prefs.specialization ?? undefined,
          uiLanguage: prefs.uiLanguage ?? undefined,
        }
      : null,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  } as const;
  // Merge with Auth0 metadata if available (best-effort)
  try {
    if (authSub !== LOCAL_AUTH_SUB) {
      const md = await auth0GetUserMetadata(authSub);
      const userMeta = (md?.user_metadata?.preferences ?? null) as Record<string, unknown> | null;
      const appMeta = (md?.app_metadata?.preferences ?? null) as Record<string, unknown> | null;
      const mergedPrefs = { ...(base.preferences ?? {}), ...(userMeta ?? {}), ...(appMeta ?? {}) } as Record<string, unknown>;
      return { ...base, preferences: Object.keys(mergedPrefs).length ? mergedPrefs : base.preferences };
    }
  } catch (e) {
    console.warn("[auth0] read metadata failed", e);
  }
  return base;
});

ipcMain.handle("profile:upsertSelf", async (_evt, input: ProfileInput) => {
  const prisma = getNeonPrisma();
  const authSub = currentAuthSub();

  // Build User update payload from supported fields
  const userData: {
    email?: string | null;
    name?: string | null;
    phone?: string | null;
    specialty?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
  } = {};
  if (Object.prototype.hasOwnProperty.call(input, "email")) {
    userData.email = input.email ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(input, "name")) {
    userData.name = input.name ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(input, "phone")) {
    userData.phone = input.phone ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(input, "specialty")) {
    userData.specialty = input.specialty ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(input, "address")) {
    userData.address = input.address ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(input, "city")) {
    userData.city = input.city ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(input, "country")) {
    userData.country = input.country ?? null;
  }

  await prisma.user.upsert({
    where: { authSub },
    create: { authSub, ...userData },
    update: { ...userData },
  });

  // Preferences mapping (optional)
  const prefsIn = (input.preferences ?? null) as
    | { greetingName?: unknown; specialization?: unknown; uiLanguage?: unknown }
    | null;
  if (prefsIn) {
    const prefData = {
      greetingName:
        typeof prefsIn.greetingName === "string" ? prefsIn.greetingName : null,
      specialization:
        typeof prefsIn.specialization === "string"
          ? prefsIn.specialization
          : null,
      uiLanguage:
        typeof prefsIn.uiLanguage === "string" ? prefsIn.uiLanguage : null,
      updatedAt: new Date(),
    };
    await prisma.userPreference.upsert({
      where: { authSub },
      create: { authSub, ...prefData },
      update: { ...prefData },
    });
  }

  // Return current state
  const u = await prisma.user.findUnique({
    where: { authSub },
    include: { preferences: true },
  });
  if (!u) return null;
  const prefs = u.preferences;
  const profile = {
    id: u.authSub,
    authSub: u.authSub,
    email: u.email ?? null,
    name: u.name ?? null,
    clinicName: null,
    specialty: u.specialty ?? null,
    phone: u.phone ?? null,
    address: u.address ?? null,
    city: u.city ?? null,
    country: u.country ?? null,
    preferences: prefs
      ? {
          greetingName: prefs.greetingName ?? undefined,
          specialization: prefs.specialization ?? undefined,
          uiLanguage: prefs.uiLanguage ?? undefined,
        }
      : null,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  } as const;

  // Best-effort push of preferences to Auth0 metadata (requires mgmt credentials)
  try {
    await trySyncAuth0Metadata(authSub, profile.preferences as Record<string, unknown> | null | undefined);
  } catch (e) {
    console.warn("[auth0] sync after upsert failed", e);
  }

  // Broadcast profile change to all renderer windows
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send("profile:changed", profile);
  }

  return profile;
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
