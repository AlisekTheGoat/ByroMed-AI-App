import { PrismaClient } from "@prisma/client";
// Neon Prisma client is generated to prisma-neon/generated/neon via prisma-neon/schema.prisma
// It contains only non-PHI models (e.g., Profile)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - path exists after running `prisma generate --schema prisma-neon/schema.prisma`
import { PrismaClient as NeonPrismaClient } from "../prisma-neon/generated/neon";

let localPrisma: PrismaClient | null = null;
let neonPrisma: NeonPrismaClient | null = null;

// Local Postgres (PHI data)
export function getLocalPrisma(): PrismaClient {
  if (!localPrisma) localPrisma = new PrismaClient();
  return localPrisma;
}

// Neon Postgres (non-PHI marketing/user mgmt)
export function getNeonPrisma(): NeonPrismaClient {
  if (!neonPrisma) neonPrisma = new NeonPrismaClient();
  return neonPrisma;
}
