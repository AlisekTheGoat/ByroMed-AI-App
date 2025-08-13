import { app } from "electron";
import { join } from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

export function ensurePrismaEnv() {
  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    const devDir = join(process.cwd(), ".data");
    if (!existsSync(devDir)) mkdirSync(devDir, { recursive: true });
    const devDb = join(devDir, "dev.sqlite");
    const envPath = join(process.cwd(), ".env");
    if (!existsSync(envPath)) {
      writeFileSync(envPath, `DATABASE_URL="file:${devDb}"\n`, {
        encoding: "utf-8",
      });
    }
    return devDb;
  }

  const userData = app.getPath("userData");
  const dbDir = join(userData, "db");
  if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });
  const dbPath = join(dbDir, "byromed.sqlite");
  const envPath = join(process.cwd(), ".env");
  if (!existsSync(envPath)) {
    writeFileSync(envPath, `DATABASE_URL="file:${dbPath}"\n`, {
      encoding: "utf-8",
    });
  }
  return dbPath;
}
