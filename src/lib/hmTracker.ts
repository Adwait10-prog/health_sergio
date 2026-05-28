import { db } from "@/lib/db";

// Returns IST date string YYYY-MM-DD
function istDateStr(d = new Date()): string {
  const istMs = d.getTime() + 5.5 * 60 * 60 * 1000;
  return new Date(istMs).toISOString().split("T")[0];
}

// Returns midnight IST as UTC (how sessions are stored)
function istToUtc(dateStr: string): Date {
  const [y, m, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day) - 5.5 * 60 * 60 * 1000);
}

export interface HMSession {
  id: string;
  date: Date;
  weekNum: number;
  dayOfWeek: string;
  type: string;
  name: string;
  targetKm: number | null;
  targetMin: number | null;
  isCutback: boolean;
}

export interface HMSessionWithLog extends HMSession {
  logStatus: string | null;
  actualKm: number | null;
  actualMin: number | null;
  effort: number | null;
}

const USER_ID = process.env.USER_ID!;

export async function getTodayHMSession(): Promise<HMSessionWithLog | null> {
  const todayStr = istDateStr();
  const todayUtc = istToUtc(todayStr);
  const tomorrowUtc = istToUtc(
    istDateStr(new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000 + 86400000))
  );

  const session = await db.hMSession.findFirst({
    where: { userId: USER_ID, date: { gte: todayUtc, lt: tomorrowUtc } },
    include: { log: true },
  });

  if (!session) return null;
  return {
    ...session,
    logStatus: session.log?.status ?? null,
    actualKm: session.log?.actualKm ?? null,
    actualMin: session.log?.actualMin ?? null,
    effort: session.log?.effort ?? null,
  };
}

export async function getLast7HMSessions(): Promise<HMSessionWithLog[]> {
  const todayStr = istDateStr();
  const todayUtc = istToUtc(todayStr);
  const sixDaysAgoUtc = new Date(todayUtc.getTime() - 6 * 864e5);

  const sessions = await db.hMSession.findMany({
    where: { userId: USER_ID, date: { gte: sixDaysAgoUtc, lte: todayUtc } },
    include: { log: true },
    orderBy: { date: "asc" },
  });

  return sessions.map(s => ({
    ...s,
    logStatus: s.log?.status ?? null,
    actualKm: s.log?.actualKm ?? null,
    actualMin: s.log?.actualMin ?? null,
    effort: s.log?.effort ?? null,
  }));
}

export async function getCurrentWeekHMStats(): Promise<{
  weekNum: number;
  targetKm: number;
  doneKm: number;
  sessions: HMSessionWithLog[];
}> {
  const todayStr = istDateStr();
  const todayUtc = istToUtc(todayStr);

  // Find today's session to get week number
  const tomorrowUtc = new Date(todayUtc.getTime() + 864e5);
  const todaySession = await db.hMSession.findFirst({
    where: { userId: USER_ID, date: { gte: todayUtc, lt: tomorrowUtc } },
  });

  if (!todaySession) return { weekNum: 0, targetKm: 0, doneKm: 0, sessions: [] };

  const weekNum = todaySession.weekNum;

  const sessions = await db.hMSession.findMany({
    where: { userId: USER_ID, weekNum },
    include: { log: true },
    orderBy: { date: "asc" },
  });

  const targetKm = sessions.reduce((sum, s) => sum + (s.targetKm ?? 0), 0);
  const doneKm = sessions
    .filter(s => s.log?.status === "done")
    .reduce((sum, s) => sum + (s.log?.actualKm ?? s.targetKm ?? 0), 0);

  return {
    weekNum,
    targetKm: Math.round(targetKm * 10) / 10,
    doneKm: Math.round(doneKm * 10) / 10,
    sessions: sessions.map(s => ({
      ...s,
      logStatus: s.log?.status ?? null,
      actualKm: s.log?.actualKm ?? null,
      actualMin: s.log?.actualMin ?? null,
      effort: s.log?.effort ?? null,
    })),
  };
}

export async function getRaceCountdown(): Promise<number> {
  const raceDate = new Date("2026-10-18T00:00:00.000Z");
  const now = new Date();
  const diffMs = raceDate.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
