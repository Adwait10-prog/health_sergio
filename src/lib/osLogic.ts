// Date-driven derivations for the Adwait OS page + the Today strip.
import { OS, type Mode } from "./osData";

// Midnight of today's IST date, expressed as a UTC Date (same convention as the Today page).
export function istToday(): Date {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const [y, m, d] = ist.toISOString().slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// Whole days from `today` to a YYYY-MM-DD date (negative = past).
export function daysUntil(dateStr: string, today: Date): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - today.getTime()) / 86400000);
}

export function computeMode(today: Date): Mode {
  if (daysUntil(OS.raceDay, today) < 0) return "post";
  if (daysUntil(OS.skeletonEnds, today) <= 0) return "block";
  return "skeleton";
}

export type Tone = "past" | "now" | "soon" | "later";
export function countdownTone(days: number): Tone {
  if (days < 0) return "past";
  if (days <= 7) return "now";
  if (days <= 21) return "soon";
  return "later";
}

// Which marathon-block week we're in (0-based), or -1 before it starts.
export function currentBlockWeek(today: Date): { index: number; daysToStart: number } {
  const index = OS.block.findIndex(w => {
    const n = daysUntil(w.weekStart, today);
    return n <= 0 && n > -7;
  });
  return { index, daysToStart: daysUntil(OS.block[0].weekStart, today) };
}

// Nearest upcoming dated countdown (for the Today strip).
export function nextCountdown(today: Date): { label: string; days: number } | null {
  const upcoming = OS.countdowns
    .filter(c => c.date)
    .map(c => ({ label: c.label, days: daysUntil(c.date as string, today) }))
    .filter(c => c.days >= 0)
    .sort((a, b) => a.days - b.days);
  return upcoming[0] ?? null;
}

export function formatIST(today: Date): string {
  return today.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
