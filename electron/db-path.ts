import { app } from "electron";
import { join } from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

export function ensurePrismaEnv() {
  const userData = app.getPath("userData");
  const dbDir = join(userData, "db");
  if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });
  const dbPath = join(dbDir, "byromed.sqlite"); // později lze vyměnit za SQLCipher
  // Vytvoř .env pro Prisma (v rootu projektu)
  writeFileSync(
    join(process.cwd(), ".env"),
    `DATABASE_URL="file:${dbPath}"\n`,
    { encoding: "utf-8" }
  );
  return dbPath;
}
