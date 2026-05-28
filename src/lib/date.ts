/**
 * IST-aware date helpers.
 *
 * The DB stores all dates as midnight IST expressed in UTC:
 *   May 26 IST  →  2026-05-25T18:30:00.000Z
 *
 * So when querying "give me today's log", we need the IST date for today,
 * then convert it to the UTC timestamp that's actually stored.
 */

/** Return the current date string in IST (YYYY-MM-DD) */
export function todayIST(): string {
  const now = new Date();
  const istMs = now.getTime() + 5.5 * 60 * 60 * 1000;
  return new Date(istMs).toISOString().split("T")[0];
}

/** Convert a YYYY-MM-DD string to the UTC Date stored in DB (midnight IST = UTC-5:30) */
export function istDateToUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - 5.5 * 60 * 60 * 1000);
}

/** Get the DB UTC Date for today in IST */
export function todayUTC(): Date {
  return istDateToUTC(todayIST());
}

/** Get the DB UTC Date for yesterday in IST */
export function yesterdayUTC(): Date {
  const now = new Date();
  const istMs = now.getTime() + 5.5 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000;
  const dateStr = new Date(istMs).toISOString().split("T")[0];
  return istDateToUTC(dateStr);
}

/** Get the DB UTC Date for N days ago in IST */
export function daysAgoUTC(n: number): Date {
  const now = new Date();
  const istMs = now.getTime() + 5.5 * 60 * 60 * 1000 - n * 24 * 60 * 60 * 1000;
  const dateStr = new Date(istMs).toISOString().split("T")[0];
  return istDateToUTC(dateStr);
}
