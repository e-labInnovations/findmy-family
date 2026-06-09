import { PrismaClient } from "@prisma/client";

// Single Prisma client per Node process. Next.js hot-reloads modules in dev,
// so attach to globalThis to avoid creating a new client on every change.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
