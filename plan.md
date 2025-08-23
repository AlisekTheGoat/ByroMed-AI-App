## ByroMed AI – Architektura, Auth a Data (MVP → Scale)

Tento dokument je zdroj pravdy pro autentizaci, datovou architekturu a implementační kroky. Cílem je jednoduché MVP (1–10 lékařů) s možností růstu (1000+ uživatelů) za minimální náklady a maximální škálovatelností, klidně i kdyby to mělo stát nějakou marži. Cílem je vytvořit aplikaci, která opravdu přinese hodnotu Lékařům.

## Cíle

- Autorizace přes Auth0 (Free tier), flow PKCE.
- Cloudová DB Neon Postgres s ORM Prisma pro ne‑PHI data a lékařská (necitlivá) data.
- Lokální úložiště (SQLite/FS) pro veškerá pacientská PHI a generované dokumenty.
- Oddělená Auth adapter vrstva: snadná výměna Auth0 → Neon Auth v budoucnu.
- Jednoduchost pro solo vývoj + AI vývoj, bezpečnost a soulad s GDPR.

## Služby a technologie

- Electron + React + Tailwind (desktop UI)
- Auth0 (PKCE + custom protocol)
  - Domain: dev-4k8r5dm2wsc1gptt.eu.auth0.com
  - Client ID: DiJissNbO2EOgxe2cNlAGEehj45uqLDh
- Neon Postgres (cloud, Free tier) + Prisma ORM
- Lokální DB: SQLite (plán: SQLCipher/OS keychain)

## Bezpečnost a GDPR (Data Residency)

- PHI (pacienti, klinické dokumenty) NESMÍ opustit zařízení.
- PHI je obsluhováno výhradně přes IPC v `electron/main.ts` a ukládáno lokálně .
- Do cloudu jdou pouze:
  - účetní/produktová metadata (uživatel, preference),
  - šablony (metadata + obsah),
  - necitlivá lékařská data (např. fakturační údaje, speciality – bez pacientů).
- Tokeny z Auth0 držíme v paměti v `main` procesu. Renderer k nim přistupuje jen přes IPC.

## Auth0 – PKCE + Custom Protocol

- Flow: Authorization Code with PKCE.
  - `main` otevře Auth0 Universal Login v systémovém prohlížeči.
  - Redirect URI: `byromed://auth/callback` (v Electronu registrujeme custom protocol a handler).
  - `main` dokončí výměnu kódu za tokeny (access/id), uloží je v paměti.
  - `preload` vystaví `window.api.auth` pro renderer (login/logout/getAccessToken/getUser).
- Env proměnné (renderer):
  - VITE_AUTH0_DOMAIN=dev-4k8r5dm2wsc1gptt.eu.auth0.com
  - VITE_AUTH0_CLIENT_ID=DiJissNbO2EOgxe2cNlAGEehj45uqLDh
- Auth0 nastavení (Dashboard):
  - Allowed Callback URLs: `byromed://auth/callback`
  - Allowed Logout URLs: dle potřeby (např. `byromed://logout` není nutné; logout řešíme lokálně).
  - Allowed Web Origins: none (desktop app), pozor na nepotřebné originy.

## Auth Adapter (vyměnitelný)

- Rozhraní:
  - `login(): Promise<void>`
  - `logout(): Promise<void>`
  - `getAccessToken(scopes?: string[]): Promise<string | null>`
  - `getUser(): Promise<{ sub: string; email?: string; name?: string } | null>`
- Implementace:
  - `Auth0Adapter` (PKCE+custom protocol, produkční)
  - `MockAdapter` (pro vývoj bez cloudu)
- Umístění a zodpovědnosti:
  - `electron/main.ts`: vlastní tok PKCE, práce s protokolem, držení tokenů v paměti.
  - `electron/preload.ts`: bridge `window.api.auth` pro renderer.
  - `src/auth/Auth.tsx`: React kontext – přepíná se mezi Mock a Auth0 adapterem dle env.

## Datová architektura

- Cloud (Neon Postgres):
  - Uživatelé (auth0_sub jako PK), profily, preference (jsonb), šablony (metadata + verze + obsah), necitlivá lékařská data.
- Lokálně :
  - Pacienti a všechny klinické dokumenty (PHI) – přes IPC vrstvy `patients:*`, `docs:*`, `calendar:*`.

## Prisma + Neon (ORM)

Použijeme Prisma pro cloudovou DB (Neon). V Electronu nedáváme DB přístup do rendereru; komunikace s Neon probíhá přes malý serverless backend, nebo přímo z `main` (lépe přes backend kvůli bezpečí DB přihlašovacích údajů). MVP: jednoduchý serverless (CF Worker/Vercel) validující Auth0 JWT a volající Neon.

### Prisma schema (cloud, výřez)

Pozn.: Níže je návrh pro Neon (cloud). Lokální SQLite schema pacientů již existuje odděleně.

```prisma
// prisma/schema.prisma (cloud modely – nasadit do Neon)
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model AppUser {
  auth0Sub   String   @id @map("auth0_sub")
  email      String?
  name       String?
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @default(now()) @map("updated_at")
  preferences UserPreferences?
  templates  Template[]
  DoctorInfo DoctorInfo?
}

model UserPreferences {
  auth0Sub  String   @id @map("auth0_sub")
  prefs     Json     @default("{}")
  updatedAt DateTime @default(now()) @map("updated_at")
  user      AppUser  @relation(fields: [auth0Sub], references: [auth0Sub], onDelete: Cascade)
}

model Template {
  id            String          @id @default(uuid())
  auth0Sub      String          @map("auth0_sub")
  name          String
  tags          String[]        @db.Text[]
  isActive      Boolean         @default(true) @map("is_active")
  latestVersion Int             @default(1) @map("latest_version")
  createdAt     DateTime        @default(now()) @map("created_at")
  updatedAt     DateTime        @default(now()) @map("updated_at")
  user          AppUser         @relation(fields: [auth0Sub], references: [auth0Sub], onDelete: Cascade)
  revisions     TemplateRevision[]
}

model TemplateRevision {
  id         String   @id @default(uuid())
  templateId String   @map("template_id")
  version    Int
  content    String   // nebo Json podle potřeby
  createdAt  DateTime @default(now()) @map("created_at")
  template   Template @relation(fields: [templateId], references: [id], onDelete: Cascade)

  @@unique([templateId, version])
}

// Necitlivá lékařská data (bez pacientů/PHI):
model DoctorInfo {
  auth0Sub     String   @id @map("auth0_sub")
  specialization String?
  licenseId    String?
  clinicName   String?
  address      String?
  phone        String?
  billingEmail String?
  updatedAt    DateTime @default(now()) @map("updated_at")
  user         AppUser  @relation(fields: [auth0Sub], references: [auth0Sub], onDelete: Cascade)
}
```

### SQL DDL (alternativa/rychlý start)

Viz předchozí sekce – tabulky `app_user`, `user_preferences`, `template`, `template_revision`. Přidána `doctor_info` pro necitlivá lékařská data.

## Serverless backend (Neon proxy)

- Validace Auth0 JWT (JWKS), poté CRUD nad Neon přes Prisma/driver:
  - `GET /me` → upsert `app_user` dle `sub`.
  - `GET/PUT /preferences` (jsonb)
  - `GET/POST /templates`, `GET/PUT/DELETE /templates/:id`
  - `GET/POST /templates/:id/revisions`
- Důvod: nechceme přímé DB přihlašovací údaje v desktopové app. Backend je levný (free tier) a bezpečnější.

## IPC hranice a lokální data

- Již existující kanály: `patients:*`, `docs:*`, `calendar:*` (lokální úložiště)
- Přidáme `auth:*` pro PKCE (login/logout/callback) a `settings:*` (lokální zrcadlení preferencí pro offline – hotovo)
- Renderer používá pouze `window.api.*` bridgované v `electron/preload.ts`.

## UI a DX poznámky

- Design systém (modro‑zdravotnická paleta, Inter/Montserrat, .btn varianty) zachovat.
- `src/auth/Auth.tsx` udržet s Mock i reálným adapterem. Header zobrazí jméno uživatele.

## Implementační kroky (prakticky)

1. Auth0 PKCE + custom protocol
   - Zaregistrovat `byromed://auth/callback` v Electron `main`.
   - `main`: otevřít login, zpracovat callback, držet tokeny v paměti.
   - `preload`: `window.api.auth.{login,logout,getAccessToken,getUser}`.
   - `Auth.tsx`: použít IPC adapter, fallback na Mock bez env.
2. Neon + Prisma
   - Vytvořit Neon DB, `DATABASE_URL` uložit jako secret backendu.
   - V backendu nasadit Prisma klienta a migrace.
3. Backend (CF Worker/Vercel)
   - Middleware JWT (Auth0), CRUD endpointy (viz výše).
4. Preference sync
   - Při startu (pokud přihlášen) stáhnout a sloučit s lokálními (`window.api.settings`).
   - Uložení → lokálně i do cloudu (best‑effort).
5. Šablony
   - Metadata+obsah držet v Neonu, možnost lokální cache pro offline.
6. PHI
   - Pacienti a dokumenty jen lokálně, žádné logování PHI.

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
