import path from "path";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createClient() {
  const url = process.env.DATABASE_URL
    ? process.env.DATABASE_URL.startsWith("file:")
      ? "file:" + path.resolve(process.env.DATABASE_URL.replace("file:", ""))
      : process.env.DATABASE_URL
    : "file:" + path.resolve("prisma/dev.db");

  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter } as any);
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
