import Database from "better-sqlite3";
import path from "path";

// process.cwd() is the project root both in dev (Next.js) and during build
const HM_DB_PATH = path.resolve(process.cwd(), "../hm-tracker/dev.db");

// Returns local date as YYYY-MM-DD — avoids UTC offset issues (sessions stored at 18:30Z = midnight IST)
function localDateStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface HMSession {
  id: string;
  date: string;
  weekNum: number;
  dayOfWeek: string;
  type: string;
  name: string;
  targetKm: number | null;
  targetMin: number | null;
  isCutback: number;
}

export interface HMSessionWithLog extends HMSession {
  logStatus: string | null;
  actualKm: number | null;
  actualMin: number | null;
  effort: number | null;
}

function openDb(): Database.Database | null {
  try {
    return new Database(HM_DB_PATH, { readonly: true, fileMustExist: true });
  } catch {
    return null;
  }
}

export function getTodayHMSession(): HMSessionWithLog | null {
  const db = openDb();
  if (!db) return null;
  try {
    const today = localDateStr();
    const row = db
      .prepare(
        `SELECT s.*, sl.status as logStatus, sl.actualKm, sl.actualMin, sl.effort
         FROM Session s
         LEFT JOIN SessionLog sl ON sl.sessionId = s.id
         WHERE date(s.date, '+5 hours', '30 minutes') = ?
         LIMIT 1`
      )
      .get(today) as HMSessionWithLog | undefined;
    return row ?? null;
  } finally {
    db.close();
  }
}

export function getLast7HMSessions(): HMSessionWithLog[] {
  const db = openDb();
  if (!db) return [];
  try {
    const today = localDateStr();
    const sixDaysAgo = localDateStr(new Date(Date.now() - 6 * 864e5));
    const rows = db
      .prepare(
        `SELECT s.*, sl.status as logStatus, sl.actualKm, sl.actualMin, sl.effort
         FROM Session s
         LEFT JOIN SessionLog sl ON sl.sessionId = s.id
         WHERE date(s.date, '+5 hours', '30 minutes') >= ?
         AND   date(s.date, '+5 hours', '30 minutes') <= ?
         ORDER BY s.date ASC`
      )
      .all(sixDaysAgo, today) as HMSessionWithLog[];
    return rows;
  } finally {
    db.close();
  }
}

export function getCurrentWeekHMStats(): {
  weekNum: number;
  targetKm: number;
  doneKm: number;
  sessions: HMSessionWithLog[];
} {
  const db = openDb();
  if (!db) return { weekNum: 0, targetKm: 0, doneKm: 0, sessions: [] };
  try {
    // Find current week number from today's session (IST-adjusted)
    const today = localDateStr();
    const todayRow = db
      .prepare(`SELECT weekNum FROM Session WHERE date(date, '+5 hours', '30 minutes') = ? LIMIT 1`)
      .get(today) as { weekNum: number } | undefined;

    const weekNum = todayRow?.weekNum ?? 0;

    const sessions = db
      .prepare(
        `SELECT s.*, sl.status as logStatus, sl.actualKm, sl.actualMin, sl.effort
         FROM Session s
         LEFT JOIN SessionLog sl ON sl.sessionId = s.id
         WHERE s.weekNum = ?
         ORDER BY s.date ASC`
      )
      .all(weekNum) as HMSessionWithLog[];

    const targetKm = sessions.reduce((sum, s) => sum + (s.targetKm ?? 0), 0);
    const doneKm = sessions
      .filter((s) => s.logStatus === "done" || s.logStatus === "partial")
      .reduce((sum, s) => sum + (s.actualKm ?? s.targetKm ?? 0), 0);

    return { weekNum, targetKm, doneKm, sessions };
  } finally {
    db.close();
  }
}

export function getRaceCountdown(): number {
  const race = new Date("2026-10-18T00:00:00");
  const now = new Date();
  return Math.max(0, Math.ceil((race.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}
