## ByroMed AI – Architektura, Auth a Data (MVP → Scale)

Tento dokument je zdroj pravdy pro autentizaci, datovou architekturu a implementační kroky. Cílem je jednoduché MVP (1–10 lékařů) s možností růstu (1000+ uživatelů) za minimální náklady a maximální škálovatelností, klidně i kdyby to mělo stát nějakou marži. Cílem je vytvořit aplikaci, která opravdu přinese hodnotu Lékařům.

## Cíle

- Autorizace přes Auth0 (Free tier), flow PKCE + custom protocol.
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

## Migration – Local PostgreSQL (PHI) + Neon (Profile)

### Env proměnné

- `DATABASE_URL` – lokální PostgreSQL pro PHI (např. `postgres://user:pass@localhost:5432/byromed_local`)
- `NEON_DATABASE_URL` – Neon pro profil (např. `postgres://...neon.tech/...`)

### Příkazy

```bash
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
  ```
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
