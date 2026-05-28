// Migrate HM sessions from old SQLite to Neon PostgreSQL
// Must set DATABASE_URL before importing db
import path from "path";
import { readFileSync } from "fs";

// Load .env.local manually before any DB imports
const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?$/);
  if (match) process.env[match[1]] = match[2];
}

import Database from "better-sqlite3";
import { db } from "../src/lib/db";

const USER_ID = process.env.USER_ID!;
const sqliteDb = new Database("/Users/mac/Health/hm-tracker/dev.db", { readonly: true });

async function main() {
  const sessions = sqliteDb.prepare("SELECT * FROM Session ORDER BY date ASC").all() as any[];
  console.log(`Found ${sessions.length} sessions in SQLite`);

  const existingCount = await db.hMSession.count({ where: { userId: USER_ID } });
  console.log(`Already in Neon: ${existingCount}`);

  if (existingCount >= sessions.length) {
    console.log("Already migrated, skipping.");
    return;
  }

  if (existingCount > 0) {
    await db.hMSession.deleteMany({ where: { userId: USER_ID } });
    console.log("Cleared partial data");
  }

  let inserted = 0;
  for (const s of sessions) {
    await db.hMSession.create({
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
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => { sqliteDb.close(); });
