# Project Rules

These rules codify how we build and operate this Electron + React (Vite) app with a Python agent and local storage.

## Architecture & Boundaries
- **Renderer (React/Vite)**: UI only. No direct filesystem, no Node APIs, no database clients.
- **Preload (`electron/preload.ts`)**: Exposes a minimal, typed, secure bridge (IPC) to the renderer. Only whitelist what the UI needs.
- **Main (`electron/main.ts`)**: Owns windows, IPC handlers, filesystem, process spawning, and app lifecycle. Enforce validation and guardrails.
- **Python agent (`agent/agent.py`)**: Runs as a child process. Communicates via JSON lines. Main is responsible for piping and broadcasting events.

## Security Defaults
- **Context isolation**: Must remain `true` in `BrowserWindow` (`contextIsolation: true`).
- **No Node integration in renderer**: Keep `nodeIntegration: false`.
- **Sandbox**: Keep `sandbox: true`.
- **Web security**: Keep `webSecurity: true`.
- **Dev-only warnings**: We set `ELECTRON_DISABLE_SECURITY_WARNINGS=true` only in dev to reduce console noise. Never disable in production.
- **CSP (production)**: Add a strict CSP meta tag in `index.html` when packaging. Keep disabled in dev to allow Vite HMR.

Suggested production CSP (adjust domains as needed):
```
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  object-src 'none';
  script-src 'self';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src  'self' https://fonts.gstatic.com data:;
  img-src   'self' data: blob:;
  connect-src 'self' https://YOUR_AUTH0_DOMAIN https://fonts.googleapis.com https://fonts.gstatic.com;
  media-src 'self' blob:;
  worker-src 'self' blob:;
"/>
```
- Prefer **self-hosted fonts/icons** in production to simplify CSP.

## IPC & Preload Rules
- **Whitelist channels**: Only expose specific IPC handlers (e.g. `agent:*`, `docs:*`, `calendar:*`).
- **Validate inputs**: Validate and sanitize all IPC payloads in main before acting.
- **No dynamic code**: Never `eval`/`Function` or run shell commands from renderer input.
- **Typed API**: Keep preload types in sync with renderer consumers.

## Data & Filesystem
- **User data location**: Use `app.getPath('userData')` for app storage.
  - Documents under: `<userData>/documents`.
  - Calendar under: `<userData>/calendar.json`.
- **File operations**: Always handle errors. Avoid blocking the UI thread with expensive work.
- **Large operations**: Offload heavy work to the Python agent or background processes.

## Database & Prisma
- **No Prisma in renderer**: PrismaClient must not be bundled for the browser. The renderer must request data over IPC.
- **Where Prisma runs**: Only in **main process** or a separate Node process/service. Never import `@prisma/client` in React code.
- **APIs**: Add IPC endpoints in main that perform DB queries and return plain data objects.

## Python Agent
- **Launch**: Use `child_process.spawn` from main with a clear env (`BYROMED_RUN_ID`, etc.).
- **Protocol**: JSON lines. Each line is a JSON object with `step`, `level`, `message`, etc.
- **Cancellation**: Support `SIGTERM` and broadcast a `canceled` event.
- **Logging**: Route `stdout` parsed events to renderer via `agent:event`. Log `stderr` with a warning tag.

## Build & Dev
- **Dev server**: Vite serves the renderer. Main loads `process.env.VITE_DEV_SERVER_URL + 'index.html'` in dev.
- **Prod load**: Main resolves built `dist/renderer/index.html`.
- **Do not relax security** for dev beyond the Electron warnings toggle; keep isolation/sandbox on.

## Coding Standards
- **TypeScript**: Use strict types. Prefer `unknown` over `any`. Narrow types with guards.
- **Folder conventions**:
  - Renderer under `src/` (components, pages, hooks, services).
  - Electron under `electron/` (`main.ts`, `preload.ts`).
  - Agent under `agent/`.
  - Prisma under `prisma/`.
- **Imports**: Keep imports at top-of-file. Avoid circular deps.
- **Error handling**: Always catch and surface actionable messages to UI (e.g., toasts or log view).
- **Logging**: Prefix logs with subsystem tags: `[main]`, `[renderer]`, `[agent]`.

## External Resources
- **Fonts/Icons**: Allow Google Fonts and Bootstrap Icons in dev; prefer self-hosting in prod.
- **Network**: Restrict `connect-src` CSP to required domains (Auth, APIs, fonts) in prod.

## Release & Packaging
- **CSP on**: Ensure CSP meta tag is enabled before packaging.
- **Secrets**: No secrets in the repo. Use environment variables or OS keychain/secure storage.
- **Testing smoke**: Verify: window loads, agent starts and finishes, docs CRUD works, calendar CRUD works.

## PR & Review Checklist
- [ ] No Prisma in renderer code (`src/**`).
- [ ] New IPC is whitelisted in preload and validates inputs in main.
- [ ] CSP updated if new external origins are required.
- [ ] Errors handled and surfaced to UI.
- [ ] Types are strict; no `any` unless unavoidable (justify).
- [ ] No console noise in prod paths; dev logs are fine.

---
If a change requires loosening any rule, document the rationale and add a task to restore the stricter setting post-merge.
