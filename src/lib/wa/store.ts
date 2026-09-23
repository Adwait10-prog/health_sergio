// Shared writes for WhatsApp handlers: today's Reflection and DailyLog rows.
import type { Prisma } from "@/generated/prisma/client";
import { db } from "../db";
import type { Ctx } from "./context";

type DailyLogFields = Omit<Prisma.DailyLogUncheckedCreateInput, "userId" | "date" | "id">;
type ReflectionFields = Pick<Prisma.ReflectionUncheckedCreateInput, "journalText" | "gratitudeItems" | "lessonsLearned" | "weeklyScore">;

// "6:12 pm" in IST
export function timeLabelIST(): string {
  const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return istNow.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

// Drop null/undefined so an update never clears an existing value.
function defined<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v != null)) as T;
}

export function todayReflection(ctx: Ctx) {
  return db.reflection.findFirst({ where: { userId: ctx.userId, date: ctx.today, type: "daily" } });
}

export async function upsertReflection(ctx: Ctx, fields: ReflectionFields) {
  const data = defined(fields);
  await db.reflection.upsert({
    where: { userId_date_type: { userId: ctx.userId, date: ctx.today, type: "daily" } },
    create: { userId: ctx.userId, date: ctx.today, type: "daily", ...data },
    update: data,
  });
}

export async function patchDailyLog(ctx: Ctx, fields: DailyLogFields) {
  const data = defined(fields);
  await db.dailyLog.upsert({
    where: { userId_date: { userId: ctx.userId, date: ctx.today } },
    create: { userId: ctx.userId, date: ctx.today, ...data },
    update: data,
  });
}

// Voice-note style journal append: every entry gets a "[time 🎤]" stamp.
export async function appendVoiceJournal(ctx: Ctx, text: string, moodScore?: number | null) {
  const existing = await todayReflection(ctx);
  const stamp = `[${timeLabelIST()} 🎤]`;
  const journalText = existing?.journalText
    ? `${existing.journalText as string}\n\n${stamp} ${text}`
    : `${stamp} ${text}`;
  await upsertReflection(ctx, { journalText, weeklyScore: moodScore || null });
  await patchDailyLog(ctx, { didJournal: true, moodScore: moodScore || null });
}
