// Migrate HM sessions from old SQLite to Neon PostgreSQL
import Database from "better-sqlite3";
import { createRequire } from "module";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { config } from "dotenv";

config({ path: ".env.local" });

const { PrismaClient } = await import("../src/generated/prisma/index.js");
const { PrismaNeon } = await import("@prisma/adapter-neon");
const { neonConfig } = await import("@neondatabase/serverless");
const ws = (await import("ws")).default;

neonConfig.webSocketConstructor = ws;
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const USER_ID = process.env.USER_ID;
const sqliteDb = new Database("/Users/mac/Health/hm-tracker/dev.db", { readonly: true });

const sessions = sqliteDb.prepare("SELECT * FROM Session ORDER BY date ASC").all();
console.log(`Found ${sessions.length} sessions in SQLite`);

// Check existing
const existingCount = await prisma.hMSession.count({ where: { userId: USER_ID } });
console.log(`Already in Neon: ${existingCount}`);

if (existingCount >= sessions.length) {
  console.log("Already migrated, skipping.");
  process.exit(0);
}

// Clear existing if partial
if (existingCount > 0) {
  await prisma.hMSession.deleteMany({ where: { userId: USER_ID } });
  console.log("Cleared partial data");
}

let inserted = 0;
for (const s of sessions) {
  await prisma.hMSession.create({
    data: {
      userId: USER_ID,
      date: new Date(s.date),
      weekNum: s.weekNum,
      dayOfWeek: s.dayOfWeek,
      type: s.type,
      name: s.name,
      targetKm: s.targetKm ?? null,
      targetMin: s.targetMin ?? null,
      notes: s.notes ?? null,
      isCutback: Boolean(s.isCutback),
      isModified: Boolean(s.isModified),
    },
  });
  inserted++;
  if (inserted % 25 === 0) console.log(`  ${inserted}/${sessions.length}...`);
}

console.log(`✅ Migrated ${inserted} sessions to Neon`);
sqliteDb.close();
await prisma.$disconnect();
process.exit(0);
