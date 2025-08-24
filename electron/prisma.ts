import { PrismaClient } from "@prisma/client";
import path from "path";
import type { PrismaClient as NeonPrismaClient } from "../prisma-neon/generated/neon";

let localPrisma: PrismaClient | null = null;
let neonPrisma: NeonPrismaClient | null = null;

// Resolve Neon Prisma client at runtime for both dev and packaged builds
function resolveNeonClientModulePath(): string {
  const candidates = [
    // Dev: run from project root
    path.join(process.cwd(), "prisma-neon", "generated", "neon"),
    // Dev/packaged: relative to dist/electron/main.js (__dirname)
    path.join(__dirname, "..", "..", "prisma-neon", "generated", "neon"),
    // Packaged: resourcesPath
    process.resourcesPath ? path.join(process.resourcesPath, "prisma-neon", "generated", "neon") : "",
  ].filter(Boolean) as string[];
  for (const p of candidates) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require.resolve(p);
      return p;
    } catch {
      // try next
    }
  }
  throw new Error(
    `Neon Prisma client not found. Tried:\n` + candidates.map((p) => " - " + p).join("\n")
  );
}
const neonClientModulePath = resolveNeonClientModulePath();
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any
const NeonClientCtor: new (...args: any[]) => NeonPrismaClient = require(neonClientModulePath).PrismaClient;
// Diagnostic log (once on module load)
try {
  // Avoid noisy logs in production; still helpful during packaging issues
  if (process.env.VITE_DEV_SERVER_URL || !process.mainModule?.filename.includes("app.asar")) {
    // eslint-disable-next-line no-console
    console.log(`[prisma] Neon client resolved at: ${neonClientModulePath}`);
  }
} catch {
  // ignore
}

export function getResolvedNeonClientPath() {
  return neonClientModulePath;
}

// Local PHI data via @prisma/client generated from prisma/schema.local.prisma (SQLite)
// Expects env DATABASE_URL_LOCAL (e.g., file:./dev.phi.db)
export function getLocalPrisma(): PrismaClient {
  if (!localPrisma) localPrisma = new PrismaClient();
  return localPrisma;
}

// Neon Postgres (non-PHI: users, preferences, templates). Expects env DATABASE_URL_CLOUD.
export function getNeonPrisma(): NeonPrismaClient {
  if (!neonPrisma) neonPrisma = new NeonClientCtor();
  return neonPrisma;
}
