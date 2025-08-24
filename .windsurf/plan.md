## ByroMed AI – Architektura, Auth a Data (MVP → Scale)

Zdroj pravdy pro architekturu, autentizaci a data. Cíl: MVP (1–10 lékařů) → škálovatelně (1000+) s nízkými náklady, vysokou bezpečností a jasnými hranicemi PHI.

## Cíle

- Autorizace přes Auth0 (Free tier), flow PKCE.
- Cloudová DB Neon Postgres s ORM Prisma pro ne‑PHI data a lékařská (necitlivá) data.
- Lokální úložiště (SQLite/FS) pro veškerá pacientská PHI a generované dokumenty.
- Oddělená Auth adapter vrstva: snadná výměna Auth0 → Neon Auth v budoucnu.
- Jednoduchost pro solo vývoj + AI vývoj, bezpečnost a soulad s GDPR.

## Služby a technologie

- Electron + React + Tailwind (desktop UI)
- Auth0 (PKCE + custom protocol)
- Neon Postgres (cloud, Free tier) + Prisma ORM
- Lokální DB: SQLite (plán: SQLCipher/OS keychain)

## Bezpečnost a GDPR (Data Residency)

- PHI (pacienti, klinické dokumenty) NESMÍ opustit zařízení.
- PHI pouze přes IPC v `electron/main.ts`, ukládáno lokálně.
- Do cloudu jen: profil/preference uživatele, šablony (metadata+obsah), necitlivá lékařská data (bez pacientů).
- Tokeny z Auth0 držíme v paměti v `main` procesu. Renderer k nim přistupuje jen přes IPC.

## Auth0 – PKCE + Custom Protocol

- Flow: Authorization Code + PKCE v systémovém prohlížeči → `byromed://auth/callback` (custom protocol) → tokeny v paměti `main`.
- Preload: vystaví `window.api.auth` (login/logout/getAccessToken/getUser).
- Env (renderer): `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`.
- Dashboard: Allowed Callback URL `byromed://auth/callback` (logout optional).

## Auth Adapter (vyměnitelný)

- Rozhraní: `login()`, `logout()`, `getAccessToken()`, `getUser()`.
- Implementace: `Auth0Adapter` (prod), `MockAdapter` (dev).
- Umístění: `main` (tok + tokeny), `preload` (bridge), `src/auth/Auth.tsx` (React context, volba adapteru).

## Datová architektura

- Cloud (Neon Postgres):
  - Uživatelé (auth0_sub jako PK), profily, preference (jsonb), šablony (metadata + verze + obsah), necitlivá lékařská data.
- Lokálně :
  - Pacienti a všechny klinické dokumenty (PHI) – přes IPC vrstvy `patients:*`, `docs:*`, `calendar:*`.

## Prisma + Neon (ORM)

- Neon obsluhujeme přes Prisma. Renderer nikdy nedrží DB přístupy.
- Preferujeme serverless proxy (CF Worker/Vercel) validující Auth0 JWT; přímý přístup z `main` je možný pro MVP, ale proxy je bezpečnější.

### Prisma schema (cloud, výřez)

Výřez modelů (Neon; lokální PHI schema je samostatně v SQLite):
- AppUser: `auth0Sub` (PK), `email`, `name`, timestamps; relations: `preferences`, `templates`, `DoctorInfo`.
- UserPreferences: `auth0Sub` (PK), `prefs` (jsonb), `updatedAt`, FK → AppUser.
- Template: `id` (uuid), `auth0Sub`, `name`, `tags[]`, `isActive`, `latestVersion`, timestamps; relations: FK → AppUser, `revisions[]`.
- TemplateRevision: `id`, `templateId`, `version` (unique per template), `content`, `createdAt`.
- DoctorInfo: `auth0Sub` (PK), `specialization`, `licenseId`, `clinicName`, `address`, `phone`, `billingEmail`, `updatedAt`, FK → AppUser.

### SQL DDL (alternativa/rychlý start)

Viz předchozí sekce – tabulky `app_user`, `user_preferences`, `template`, `template_revision`. Přidána `doctor_info` pro necitlivá lékařská data.

## Serverless backend (Neon proxy)

- Validace Auth0 JWT (JWKS) → CRUD nad Neon: `/me` (upsert user), `/preferences`, `/templates`, `/templates/:id`, `/templates/:id/revisions`. Důvod: žádné DB přístupy v desktopu; levné a bezpečné.

## IPC hranice a lokální data

- Již existující kanály: `patients:*`, `docs:*`, `calendar:*` (lokální úložiště)
- Přidáme `auth:*` pro PKCE (login/logout/callback) a `settings:*` (lokální zrcadlení preferencí pro offline – hotovo)
- Renderer používá pouze `window.api.*` bridgované v `electron/preload.ts`.

## UI a DX poznámky

- Design systém (modro‑zdravotnická paleta, Inter/Montserrat, .btn varianty) zachovat.
- `src/auth/Auth.tsx` udržet s Mock i reálným adapterem. Header zobrazí jméno uživatele.

## Implementační kroky (prakticky)

- Auth0 PKCE + custom protocol: registrovat `byromed://auth/callback`; `main` drží tokeny; `preload` vystaví `window.api.auth`; `Auth.tsx` volí adapter (Mock/Prod).
- Neon + Prisma: vytvořit DB, nastavit secret `DATABASE_URL`, nasadit klienta a migrace v backendu.
- Backend (CF Worker/Vercel): JWT middleware (Auth0), CRUD endpointy.
- Preference sync: start → stáhnout/sloučit; save → lokálně i cloud (best‑effort).
- Šablony: v Neonu (metadata+obsah), volitelná lokální cache pro offline.
- PHI: pouze lokálně; žádné logování PHI.

## Change Log

[2025-08-20] – Plan: Kompletní přepsání plánu. Auth0 PKCE + custom protocol (domain/id doplněny). Přidán návrh Prisma schématu pro Neon (uživatel, preference, šablony, DoctorInfo). Popsán serverless backend, IPC rozhraní a GDPR zásady.

[2025-08-20 16:58] – Auth0 configuration added for this app (Dev + Electron)

[2025-08-20 20:58] – Migration: Local PostgreSQL + Dual Prisma clients (PHI local, Neon for profile only)

- Lokální DB převedena z SQLite na PostgreSQL (PHI: `Patient`, `ExportedDocument`, `AgentRun`, `AgentEvent`, `Template`).
- `Profile` model odstraněn z lokálního schématu (`prisma/schema.prisma`), je nyní pouze v `prisma-neon/schema.prisma` (ne-PHI, marketing/user mgmt).
- Přidán dual-client přístup v `electron/prisma.ts`: `getLocalPrisma()` (PHI, `DATABASE_URL`) a `getNeonPrisma()` (Neon, `NEON_DATABASE_URL`).
- `electron/main.ts` aktualizován: `patients:*` používá lokální Postgres; `profile:*` používá Neon.
- Přidány npm skripty: `prisma:generate`, `prisma:migrate:local`, `postinstall` generuje oba klienty.
- Pozn.: soubor `electron/db-path.ts` (sqlite helper) je již nepoužitý; odstraňte jej spolu s `.data/` a sqlite migracemi.

[2025-08-20 21:23] – Cleanup: Removed `electron/db-path.ts` (SQLite env writer) to prevent accidental `.env` rewrites. Next: remove `.data/` and `prisma/migrations_sqlite_backup_*`.

[2025-08-20 21:26] – Cleanup: Removed `.data/` directory (old SQLite files) from project root.

[2025-08-20 21:27] – Cleanup: Removed `prisma/migrations_sqlite_backup_1755699379/` and `prisma/dev.db` (SQLite artifacts).

[2025-08-20 21:41] – Schema: Created `prisma-neon/schema.prisma` (Neon, non-PHI `Profile`) and generated Neon client (`prisma-neon/generated/neon`).

[2025-08-20 21:42] – Env: Reset `.env` to template placeholders for `DATABASE_URL` (local Postgres) and `NEON_DATABASE_URL` (Neon). Fill both before pushing/migrating.

[2025-08-21 06:49] – Local Postgres: Installed `postgresql@16` via Homebrew and started service (`brew services start postgresql@16`). Next: create role `byromed` and DB `byromed_local` and set `DATABASE_URL`.

[2025-08-21 07:05] – Local Postgres: Created role `byromed` and DB `byromed_local`. Updated `.env` `DATABASE_URL=postgresql://byromed:postgres@localhost:5432/byromed_local?schema=public`. Ran `prisma generate --schema prisma/schema.prisma` and `prisma migrate dev --name init_local`.

## Migration – Local PostgreSQL (PHI) + Neon (Profile)

### Env proměnné

- `DATABASE_URL` – lokální PostgreSQL pro PHI (např. `postgres://user:pass@localhost:5432/byromed_local`)
- `NEON_DATABASE_URL` – Neon pro profil (např. `postgres://...neon.tech/...`)

### Příkazy

````bash
# 1) Spusť lokální Postgres a vytvoř DB (příklad pro psql)
createdb byromed_local || true

# 2) Nastav env pro lokální DB a proveď migrace
export DATABASE_URL=postgres://USER:PASS@localhost:5432/byromed_local
npm run prisma:migrate:local

- **Client ID**: `DiJissNbO2EOgxe2cNlAGEehj45uqLDh`
- **Redirect URI (Electron)**: `byromed://auth/callback`
- **Renderer env (Vite)**:
  - `VITE_AUTH0_DOMAIN=dev-4k8r5dm2wsc1gptt.eu.auth0.com`
  - `VITE_AUTH0_CLIENT_ID=DiJissNbO2EOgxe2cNlAGEehj45uqLDh`

### Auth0 – Dashboard Settings

- **Allowed Callback URLs**: `byromed://auth/callback`
- **Allowed Logout URLs**: (optional) leave empty; logout is local.
- **Allowed Web Origins**: not needed for desktop.

### Dev Setup (Electron)

- Create `.env.local` in project root with:
  ```env
  VITE_AUTH0_DOMAIN=dev-4k8r5dm2wsc1gptt.eu.auth0.com
  VITE_AUTH0_CLIENT_ID=DiJissNbO2EOgxe2cNlAGEehj45uqLDh
````

- Start processes:
  - `npm run vite`
  - `npm run watch:electron`
  - `npm run electron`
- Look for Electron logs: `[main] preload path: ... (exists=true)` and `[preload] api keys: [...]`.

### Notes

- In macOS dev, deep-links may be flaky. If login stalls on “Probíhá přihlášení…”, temporarily fall back to mock auth (set empty VITE vars or force mock in `AuthProvider` during dev). Production packaging will properly register the `byromed://` protocol.

# ByroMed AI – Shared Plan and Next Steps

This document tracks ongoing plans, decisions, and next steps.

## Design System Notes

- Fonts: Inter, Montserrat, Roboto, Public Sans, Tinos (Czech + English). Sensation/Arial optional via system.
- Tailwind utility-first styling with medical-themed palette.
- Components: Buttons (primary/secondary/danger), Cards, Forms, Navigation.
- Accessibility: high contrast, keyboard navigation, ARIA where appropriate.

## Icons

- Using Bootstrap Icons (free).
- Included via CDN in `index.html`.
- Usage example: `<i class="bi bi-plus-lg" />`.

## Calendar

- Storage via Electron IPC with localStorage fallback for dev.
- Views: Day (timeline), Week, Month, Upcoming (next 3).
- Today highlighting: full-cell primary color with hover.
- "DNES" button centers today for all layouts.

## Dashboard

- TODO list widget with priority and optional patient selection.
- Complete action: strike-through + ease-out fade, then auto-remove.
- Persist tasks to localStorage.

## Authentication

- Target: Auth0 integration (`@auth0/auth0-react`).
- Interim: local mock login to unblock UI; header displays user name.
- Next: wire Auth0 domain/clientId via env; protect routes.

2025-08-20 – ARCHITECTURE: Auth0 + Neon + Local PHI

- Cíl: Použít Auth0 (Free) pro autentizaci, Neon Postgres pro cloudová ne-PHI data (uživatel, preference, šablony), a nechat pacienty/dokumenty lokálně v SQLite.
- Motivace: Nízká cena, jednoduchost (MVP), připravenost na růst.
- Zásady:
  - PHI (pacienti, klinické dokumenty) zůstávají jen lokálně (`electron/main.ts` + lokální SQLite/FS; žádné odesílání ven).
  - Cloud drží pouze účetní/produktová metadata: profil uživatele, UI preference, šablony a jejich revize.
  - Autentizace oddělena adapterem → snadná budoucí výměna (např. Neon Auth).

2025-08-20 – AUTH FLOW (Electron + React)

- Flow: Authorization Code with PKCE přes systémový prohlížeč a návrat do aplikace přes custom URL scheme.
  - Electron `main` otevře systémový prohlížeč (Auth0 Universal Login).
  - Redirect URI: `byromed://auth/callback` (custom protocol, registrovaný v Electronu při startu).
  - `main` zachytí callback, dokončí výměnu kódu za tokeny a uloží je bezpečně v paměti procesu (ne na disk).
  - `preload` vystaví `api.auth` metody (login/logout/getAccessToken/getUser) pro renderer.
- Alternativa pro MVP (fallback): Device Authorization Flow (jednodušší na implementaci, horší UX). Případně dočasný mock pro vývoj bez účtu.
- Balíčky: `@auth0/auth0-react` pro renderer UI, custom IPC pro tokeny (tokeny zůstávají v main procesu; renderer dostává jen krátkodobé access tokeny nebo podpisované tvrzení přes IPC).

2025-08-20 – AUTH ADAPTER LAYER (Swappable)

- Interface (návrh):
  - `AuthAdapter.login(): Promise<void>`
  - `AuthAdapter.logout(): Promise<void>`
  - `AuthAdapter.getAccessToken(scopes?: string[]): Promise<string | null>`
  - `AuthAdapter.getUser(): Promise<{ sub: string; email?: string; name?: string } | null>`
- Implementace 1: `Auth0Adapter` (výchozí).
- Implementace 2: `MockAdapter` (pro vývoj bez cloudu).
- Místo napojení: `electron/main.ts` (správa tokenů), `electron/preload.ts` (`api.auth.*`), `src/auth/Auth.tsx` (React context přepínatelný adapterem).

2025-08-20 – NEON POSTGRES SCHEMA (DDL návrh)

```sql
-- Users (Auth0 subject jako primární identifikátor)
create table if not exists app_user (
  auth0_sub text primary key,
  email text,
  name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Preferences (UI nastavení apod.)
create table if not exists user_preferences (
  auth0_sub text references app_user(auth0_sub) on delete cascade,
  prefs jsonb not null default '{}',
  updated_at timestamptz default now(),
  primary key (auth0_sub)
);

-- Templates (metadata) – přehled šablon uživatele
create table if not exists template (
  id uuid primary key default gen_random_uuid(),
  auth0_sub text references app_user(auth0_sub) on delete cascade,
  name text not null,
  tags text[] default '{}',
  is_active boolean default true,
  latest_version int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Template revisions – verzování obsahu šablon (text/JSON)
create table if not exists template_revision (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references template(id) on delete cascade,
  version int not null,
  content text not null, -- nebo jsonb dle potřeby
  created_at timestamptz default now(),
  unique (template_id, version)
);
```

Pozn.: Použijeme `gen_random_uuid()` (rozšíření `pgcrypto` nebo `uuid-ossp` dle dostupnosti v Neon). Alternativně generovat UUID v aplikaci.

2025-08-20 – BACKEND (Serverless proxy k Neonu)

- Minimalistický worker (Cloudflare Worker / Vercel), který:
  - ověří Auth0 access token (JWKS)
  - připojí se k Neon (pooled/HTTP)
  - poskytne REST API: `/me` (upsert app_user), `/preferences` (GET/PUT), `/templates` (CRUD), `/templates/:id/revisions` (CRUD)
- Důvod: nechceme přímé DB přihlašovací údaje v desktopu; validace přístupu mimo klienta.

2025-08-20 – LOKÁLNÍ PHI DATA (Pacienti, dokumenty)

- Zůstávají v Electron main (SQLite/FS) – již máme IPC vrstvy: `patients:*`, `docs:*`, `calendar:*`.
- Šifrování: MVP běží bez transparentního šifrování (pragmaticky).
  - Roadmapa: přechod na SQLCipher / OS-level šifrovaný keychain + at-rest encryption pro dokumenty.
  - Nikdy neodesílat PHI mimo zařízení.

2025-08-20 – IMPLEMENTAČNÍ KROKY (MVP)

- Krok 1: Přidat `api.auth` v `electron/preload.ts` (login/logout/getAccessToken/getUser) → volá IPC `auth:*`.
- Krok 2: `electron/main.ts` – Auth0Adapter: otevření systémového prohlížeče (PKCE), příjem callbacku (custom protocol), výměna za tokeny, uložení v paměti.
- Krok 3: Renderer (`src/auth/Auth.tsx`) – využít adapter přes `window.api.auth`, UI (Login/Logout), zobrazení profilu v `Header`.
- Krok 4: Serverless endpointy a Neon migrace (viz DDL), jednoduchý fetch klient v rendereru s `Authorization: Bearer <token>`.
- Krok 5: Napojit uživatelské preference: při startu načíst z cloudu a zrcadlit do lokálu (`window.api.settings`) pro offline, při uložení pushnout do cloudu.
- Krok 6: Šablony: metadata a obsah do Neonu (levné), generované dokumenty zůstanou lokálně.

2025-08-20 – BEZPEČNOSTNÍ POZNÁMKY

- Tokeny držet v `main` procesu (paměť) – renderer požaduje krátkodobé tokeny přes IPC nebo provádí operace přes `main` proxy.
- Zúžit CORS/allowed callbacks v Auth0 na dev/prod URL + custom protocol.
- Žádné PHI do logů, žádné PHI do chybových hlášek.

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

If a change requires loosening any rule, document the rationale and add a task to restore the stricter setting post-merge.

## Change Log (continued)

[2025-08-21 07:31] – Neon: Recreated `prisma-neon/schema.prisma`, generated Neon client to `prisma-neon/generated/neon`, and pushed schema to Neon (DB "ByroMed_DB", schema "public"). `NEON_DATABASE_URL` confirmed via successful `prisma db push`.

[2025-08-22 05:55] – Electron/Prisma: Fixed Neon client resolution and packaging

- Updated `electron/prisma.ts` to resolve the Neon Prisma client at runtime using `process.cwd()` + `prisma-neon/generated/neon`, while keeping a type-only import for TypeScript.
- Included `electron/prisma.ts` in `electron/tsconfig.json` so the watch build emits `dist/electron/prisma.js` (previously only `main.ts` was compiled).
- Updated `package.json` electron-builder `build.files` to include `prisma-neon/generated/neon/**` so the packaged app can load the Neon Prisma client.
- Note: In dev, please restart the Electron process once (stop `npm run dev` and start it again) so it picks up the updated `dist/electron/prisma.js`.

[2025-08-22 05:58] – Diagnostics + Resolver hardening

- Hardened Neon client path resolution in `electron/prisma.ts` with multiple candidates (cwd, \_\_dirname, resourcesPath) using `require.resolve`.
- Exposed `getResolvedNeonClientPath()` and added one-time diagnostic log `[prisma] Neon client resolved at: ...` in main process.
- Added IPC `diagnostics:neonPath` in `electron/main.ts` and exposed `window.api.diagnostics.neonPath()` in `electron/preload.ts` for quick runtime verification.
- Updated `package.json` `asarUnpack` to include `prisma-neon/generated/neon/**` so packaged runtime can require the client outside ASAR.

## Corrections – Storage and Auth Flow (authoritative overrides)

- Replace any remaining mentions of SQLite/FS for local PHI with local PostgreSQL.

  - Authoritative storage: Local PostgreSQL for PHI (patients, documents, agent runs/events, templates). Neon PostgreSQL for non-PHI (user profile, preferences, metadata).
  - Dual Prisma clients remain: `getLocalPrisma()` uses `DATABASE_URL` (local Postgres). `getNeonPrisma()` uses `NEON_DATABASE_URL` (Neon Postgres).
  - Older references to SQLite in this document are deprecated by this correction.

- Auth0 login must occur at app start with explicit credentials prompt.
  - Flow: Open app → Auth0 Universal Login (email/password) → Login → Access app and databases.
  - Implementation: `buildAuthorizeUrl()` enforces `prompt=login` and `max_age=0`, and `startAuthLogin()` is invoked after protocol registration on app startup.

## Auth Rewrite – Embedded Login Gate (2025-08-22 06:25)

- Replaced external-browser + custom protocol deep-link method with an embedded `BrowserWindow` login.

  - `startAuthLogin()` now opens Auth0 Universal Login inside a dedicated window and intercepts the `byromed://auth/callback` URL via `will-redirect`/`will-navigate`.
  - On intercept, the code is exchanged for tokens directly in the main process and the login window is closed.
  - If the login window is closed or an error occurs, app startup is aborted (no main window).

- Main window creation is gated by successful authentication.

  - On `app.whenReady()`, we await `startAuthLogin()` first; only then `createWindow()` is called.
  - Removed custom protocol registration and OS deep-link handling from startup to avoid opening any external app.

- Rationale: Guarantees the exact flow — open app -> Auth0 login -> login -> access app. Any failure is handled by Auth0 UI, and the app won’t open without authentication.

## Auth Update – HTTPS Redirect Intercept (2025-08-22 06:28)

- Switched `AUTH0_REDIRECT_URI` to `https://byromed.local/auth/callback` and intercept it inside the embedded login window using `session.webRequest.onBeforeRequest`.
- Blocks any popups via `setWindowOpenHandler` and prevents external browser launches.
- Action required in Auth0: add `https://byromed.local/auth/callback` to Allowed Callback URLs.

## Auth Fix – Callback URL Mismatch (2025-08-22 06:33)

- Error observed: "Callback URL mismatch. The provided redirect_uri is not in the list of allowed callback URLs."
- Resolution options:
  - Preferred: In Auth0 Application Settings, add `https://byromed.local/auth/callback` to Allowed Callback URLs. Save, then restart the app.
  - Alternative: Keep embedded login but revert `AUTH0_REDIRECT_URI` back to `byromed://auth/callback` (already intercepted inside the login window) to avoid Auth0 settings changes. Ensure `byromed://auth/callback` remains in Allowed Callback URLs.
- Notes:
  - Only exact matches are accepted by Auth0. Include the full URL string.
  - If implementing logout later, add the same base to Allowed Logout URLs.

## Auth Update – Reverted to Custom Scheme (2025-08-22 06:34)

- Code now uses `AUTH0_REDIRECT_URI = byromed://auth/callback` again.
- Embedded login remains; the redirect is intercepted via `will-redirect`/`will-navigate` inside the login window, so no OS protocol registration is required.
- This avoids the need to modify Auth0 settings if `byromed://auth/callback` is already allowed.

## Auth0 Removal – Renderer & Preload (2025-08-22 07:25)

- Removed `window.api.auth` exposure in `electron/preload.ts`.
- Replaced `src/auth/Auth.tsx` with a no-auth stub (always authenticated, login/logout are no-ops).
- Unguarded routes in `src/Router.tsx` (removed `RequireAuth`).
- Cleaned `src/components/Header.tsx` (removed login/logout and user display; kept profile button).
- Removed Auth0 env typings and module declaration from `src/env.d.ts`.
- Added typings for `window.api.profile` and `window.api.diagnostics` to match preload API.
- Removed `@auth0/auth0-react` from `package.json` (run install to update lockfile).

### Notes

- Electron security settings unchanged (`contextIsolation`, `sandbox`, `webSecurity`).
- Profile IPC in `electron/main.ts` now uses a fixed local `authSub` string; no tokens are used.

### Next Steps

- Run: `npm install` to refresh the lockfile and prune dependencies.
- Verify compile/run: `npm run dev`.
- Optional: Update or deprecate earlier Auth0 plan sections above to reflect the new no-auth baseline.

## Dependency Refresh — npm install (2025-08-22 07:44)

- Executed `npm install`.
- Removed 2 packages; 0 vulnerabilities reported.
- Prisma clients regenerated for local and neon schemas during postinstall.
- Ready to start dev and verify runtime.

## Renderer Auth Stub & Type-Checks (2025-08-22 07:46)

- Created `src/auth/Auth.tsx` with a minimal no-auth stub exporting `AuthProvider` and `useAuth` to satisfy `src/App.tsx` import.
- Type-checked Electron (`electron/tsconfig.json`) — OK.
- Type-checked renderer (`tsconfig.json`) — OK.

## Dev Run — Initial Verification (2025-08-23 07:43)

- Started `npm run dev` (concurrently runs Vite + Electron watchers).
- Electron main/preload watchers report 0 errors; Electron launched against Vite URL.
- Proceeding with manual UI sanity checks.

## UI Update – Header Greeting (2025-08-23 08:15)

- Implemented personalized greeting in `src/components/Header.tsx`.
- Fetches profile via `window.api.profile.getSelf()` (Neon, non-PHI) on mount.
- Fallback priority for name: `preferences.greetingName` → `profile.name` → `"Doctor"`.
- Ensures title prefix: adds `Dr.` if name doesn't already start with `Dr.`.
- Specialization suffix: uses `preferences.specialization` → `profile.specialty` if present, rendered as `• Specialization`.
- Non-blocking: failures are ignored; header renders without greeting.
- Styling: subtle text on the right, hidden on XS screens; conforms to medical design system.

## Data Update – Prisma Schemas (2025-08-23 09:05)

- Created new local PHI schema `prisma/schema.local.prisma` using SQLite for on-device data (models: `Patient`, `Template`, `ExportedDocument`, `AgentRun`, `AgentEvent`).
- Updated cloud schema `prisma-neon/schema.prisma` to use `DATABASE_URL_CLOUD` and define models: `Organization`, `User` (Auth0 `sub`), `UserPreference` (fields `greetingName`, `specialization`, `uiLanguage`), and `CloudTemplate`.
- Adjusted `package.json` script `prisma:generate:local` to target the new local schema; Neon client remains generated to `prisma-neon/generated/neon`.

### Runbook

- Env variables expected:
  - `DATABASE_URL_LOCAL` for SQLite (e.g., `file:./dev.phi.db`).
  - `DATABASE_URL_CLOUD` for Neon Postgres.
- Generate clients:
  - `npm run prisma:generate` (runs local + neon).
- Migrations:
  - Local: pending script update (t3) — will add `prisma:migrate:local:sqlite` against `schema.local.prisma`.

## App State Summary (2025-08-24 21:22)

- Auth: MVP runs without external auth. Profile IPC uses a fixed `authSub = "local"`. Auth0 remains planned but is not required for local dev.
- Cloud DB: Neon Postgres (`prisma-neon/schema.prisma`) with `User` and `UserPreference`. IPC handlers `profile:getSelf` and `profile:upsertSelf` map to this schema and return a stable profile shape to the renderer.
- Local DB: SQLite via `prisma/schema.local.prisma` for all PHI (patients, documents, agent runs/events, templates). Access only through Electron IPC.
- IPC & Security: `contextIsolation: true`, `sandbox: true`; renderer uses only `window.api.*` from `electron/preload.ts`.
- UI: Reusable `Toast` component (`src/components/Toast.tsx`) portals to `document.body` (no layout shift). Integrated in `Profile.tsx` and `Settings.tsx`. Patients page shows consistent toasts and can be refactored to use the component.
- Design System: Tailwind medical palette with dark mode, Inter/Montserrat typography, accessible forms and buttons.

## Maintenance – Plan compaction (2025-08-24 21:30)

- Compacted opening sections while preserving headings/subheadings: intro, Služby/technologie, GDPR, Auth0 flow, Auth Adapter.
- Removed non-essential specifics (Auth0 domain/Client ID), tightened wording and bullets for clarity.
- Kept authoritative content below and earlier “App State Summary (2025-08-24 21:22)”.

## Maintenance – Patients toast refactor (2025-08-24 21:39)

- Patients page (`src/pages/Patients.tsx`) now uses reusable `Toast` component (`src/components/Toast.tsx`) that portals to `document.body` to avoid layout shift.
- Removed manual `setTimeout` dismissals; `Toast` handles auto-dismiss (`duration=3000ms`) and calls `onClose` to clear state.
- Inline toast markup removed; styling and dark mode are unified across Profile, Settings, and Patients pages.

## Auth0 PKCE – Preload + React wiring (2025-08-24 22:07)

- Exposed `window.api.auth` in `electron/preload.ts` with: `login`, `logout`, `getStatus`, `getAccessToken`, `getUser`, and `onChanged` (broadcast listener for `auth:changed`).
- Updated renderer typings to match preload API: `src/types/preload.d.ts`, `src/types/global.d.ts`, `src/env.d.ts`.
- Replaced `src/auth/Auth.tsx` no-auth stub with an IPC-backed provider. It bootstraps with `getStatus()`, subscribes to `onChanged`, and drives UI auth state. Includes a safe mock fallback if `api.auth` is unavailable in dev.
- Next actions:
  - Register custom protocol `byromed://` in electron-builder (`package.json`) and call `app.setAsDefaultProtocolClient` at runtime. Ensure redirect `byromed://auth/callback` remains allowed in Auth0.
  - End-to-end test: login → fetch profile → update preferences → logout.
  - Investigate intermittent "Step is still running" message during login; likely from event pipeline timing in the login window or IPC broadcast.

## Auth Guard + Login Route (2025-08-24 22:26)

- Added route guard in `src/Router.tsx` using `useAuth()` (`RequireAuth` component). All app routes now require authentication.
- Created `src/pages/Login.tsx` with a single "Sign in with Auth0" button calling `useAuth().login()`. After success, user is redirected to intended route.
- Routing: `/login` is public; everything else is under `RequireAuth` + `LayoutWrapper`.
- Styling follows Tailwind-based design system; dark mode compatible.

## Profile Sync – Renderer subscriptions (2025-08-24 22:45)

- Implemented live profile subscriptions in renderer using `window.api.profile.onChanged`.
- Files updated:
  - `src/pages/Settings.tsx` – Subscribes on mount and merges incoming profile/preference fields into the existing form state (prefers `preferences.greetingName`, `preferences.specialization`, `preferences.uiLanguage`; also syncs `email`, `phone`, `address`, `city`, `country`, `name`). Cleans up the subscription on unmount.
  - `src/pages/Profile.tsx` – Subscribes on mount and replaces the local `profile` state with the incoming payload for real-time reflection. Cleans up the subscription on unmount.
- Typings: Reuse existing preload typings (`src/types/preload.d.ts`, `src/types/global.d.ts`, `src/env.d.ts`). No schema or type changes required.
- Flow: `profile:upsertSelf` in the renderer triggers Neon update in `electron/main.ts` → main broadcasts `profile:changed` → `electron/preload.ts` forwards to renderer subscribers via `onChanged`.
- Test plan:
  - Open two app windows; edit and save profile in one. The other should update in real time.
  - In Settings, verify name/email/phone/address/city/country/preference fields adjust after an external profile change.

## Auth0 Metadata Sync + Online-Only Enforcement (2025-08-24 23:05)

- Summary:
  - Added best-effort synchronization of user preferences with Auth0 Management API (both `user_metadata.preferences` and `app_metadata.preferences`).
  - Enforced online-only startup: app checks connectivity at `app.whenReady()` and quits with an error if offline.

- Implementation (main process `electron/main.ts`):
  - New helpers: `getMgmtToken()` (Client Credentials), `auth0GetUserMetadata()`, `auth0PatchUserMetadata()`, `trySyncAuth0Metadata()`.
  - `profile:getSelf`: returns Neon profile merged with Auth0 metadata prefs (if available). Merge order: Neon → `user_metadata.preferences` → `app_metadata.preferences`.
  - `profile:upsertSelf`: after DB upsert, pushes preferences to both Auth0 metadata objects under `preferences` key.
  - `isOnline()`: probes `https://AUTH0_DOMAIN/.well-known/openid-configuration` and `https://www.google.com/generate_204`; if both fail, show error and `app.quit()`.

- Environment variables (optional but recommended for sync):
  - `AUTH0_MGMT_CLIENT_ID`
  - `AUTH0_MGMT_CLIENT_SECRET`
  - Uses existing `VITE_AUTH0_DOMAIN` for audience: `https://<domain>/api/v2/`.
  - Behavior: if any are missing, metadata sync is skipped silently; app continues normally.

- IPC & typings impact:
  - No new IPC channels were added; existing `profile:getSelf` and `profile:upsertSelf` semantics are extended transparently.
  - No changes required in `electron/preload.ts` or renderer typings; UI continues to use `window.api.profile` as before.

- Testing:
  - Ensure you are online. Start the app; verify it opens. Disconnect network and restart; verify an error dialog appears and the app quits.
  - With management credentials set, update preferences in Settings and save. Confirm that Auth0 user profile reflects the `preferences` object in both `user_metadata` and `app_metadata`.
  - Call `profile:getSelf` (e.g., refresh the page) and verify merged preferences include values from Auth0 metadata if different.

- Notes:
  - All Auth0 calls are best-effort and non-blocking for the UI. Failures are logged with `[auth0]` warnings but do not hard-fail profile flows.
  - Preferences are shallow-merged; future work can add conflict resolution strategies and selective fields.

## Online-Only Enforcement Removed (2025-08-24 23:59)

- Summary:
  - Removed startup connectivity gate. The app no longer requires an online check at launch.
  - Rationale: Auth0 login flow already inherently requires internet; we should not block the app globally. This also allows offline usage for local-only features.

- Changes:
  - Deleted `isOnline()` helper and removed its call in `app.whenReady()` inside `electron/main.ts`.
  - Startup now directly calls `createWindow()`.

- Notes:
  - Metadata sync remains best-effort and only runs when online and management credentials are present.
  - Login to Auth0 still requires connectivity; renderer/UI handles the flow and errors gracefully.
