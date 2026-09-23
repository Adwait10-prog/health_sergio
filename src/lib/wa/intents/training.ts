// reschedule_session · skip_session
import { addDays, getDay, subDays } from "date-fns";
import type { Handler } from "./types";
import { db } from "../../db";

// "today" / "tomorrow" / "monday" → a DB-compatible IST-midnight date
export function resolveDay(dayStr: string, today: Date): Date | null {
  const s = dayStr.toLowerCase().trim();
  if (s === "today")     return today;
  if (s === "tomorrow")  return addDays(today, 1);
  if (s === "yesterday") return subDays(today, 1);

  // Named weekday — the next occurrence, or today if it matches
  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const targetIdx = weekdays.indexOf(s);
  if (targetIdx === -1) return null;
  let diff = targetIdx - getDay(today);
  if (diff < 0) diff += 7;
  return addDays(today, diff);
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const rescheduleSession: Handler = async (ctx, parsed) => {
  const fromDayStr = (parsed.data.fromDay as string ?? "today").toLowerCase();
  const toDayStr   = (parsed.data.toDay   as string ?? "today").toLowerCase();
  const fromDate = resolveDay(fromDayStr, ctx.today);
  const toDate   = resolveDay(toDayStr,   ctx.today);

  if (!fromDate || !toDate) {
    await ctx.reply("Couldn't figure out which days to swap. Try saying something like 'swap today and tomorrow' or 'do tomorrow's run today'.");
    return;
  }

  const [fromSession, toSession] = await Promise.all([
    db.hMSession.findFirst({ where: { userId: ctx.userId, date: fromDate } }),
    db.hMSession.findFirst({ where: { userId: ctx.userId, date: toDate } }),
  ]);
  if (!fromSession) { await ctx.reply(`No training session found for ${fromDayStr}. Nothing to swap.`); return; }
  if (!toSession)   { await ctx.reply(`No training session found for ${toDayStr}. Nothing to swap.`); return; }

  // Swap workout content between the two dates (dates stay fixed)
  const pick = (s: typeof fromSession) => ({
    type: s.type, name: s.name, targetKm: s.targetKm, targetMin: s.targetMin, notes: s.notes, isCutback: s.isCutback,
  });
  const fromFields = pick(fromSession);
  const toFields   = pick(toSession);

  await Promise.all([
    db.hMSession.update({ where: { id: fromSession.id }, data: { ...toFields,   isModified: true } }),
    db.hMSession.update({ where: { id: toSession.id },   data: { ...fromFields, isModified: true } }),
  ]);

  const fromLabel = fromDayStr === "today" ? "Today" : cap(fromDayStr);
  const toLabel   = toDayStr === "today" ? "today" : toDayStr;
  await ctx.reply(`✅ Swapped! ${fromLabel}'s session is now "${toFields.name}" and ${toLabel}'s is "${fromFields.name}". Both marked as modified in your plan.`);
};

export const skipSession: Handler = async (ctx, parsed) => {
  const dayStr = (parsed.data.day as string ?? "today").toLowerCase();
  const reason = parsed.data.reason as string | null;

  const targetDate = resolveDay(dayStr, ctx.today);
  if (!targetDate) {
    await ctx.reply("Couldn't figure out which day to skip. Try 'skip today' or 'skip tomorrow's run'.");
    return;
  }
  const session = await db.hMSession.findFirst({ where: { userId: ctx.userId, date: targetDate } });
  if (!session) { await ctx.reply(`No training session found for ${dayStr}.`); return; }

  await db.hMSessionLog.upsert({
    where:  { sessionId: session.id },
    create: { sessionId: session.id, userId: ctx.userId, status: "skipped", notes: reason ?? null },
    update: { status: "skipped", ...(reason && { notes: reason }) },
  });

  const label = dayStr === "today" ? "Today's" : `${cap(dayStr)}'s`;
  await ctx.reply(`Got it — ${label} "${session.name}" marked as skipped${reason ? ` (${reason})` : ""}. Rest up 💤`);
};
