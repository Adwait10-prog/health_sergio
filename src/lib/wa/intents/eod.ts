// draft_eod — compose today's EoD update and store it as the day's work record
import type { Handler } from "./types";
import type { Ctx } from "../context";
import { db } from "../../db";
import { composeEod, fetchTodayActivity } from "../../eod";

// Shared by WhatsApp and the web "Draft EoD" button.
export async function draftAndSaveEod(userId: string, today: Date, notes: string | null, source: "text" | "voice" | "web") {
  const activity = await fetchTodayActivity(userId, today);
  const eod = await composeEod(activity, notes);
  const row = { outcome: eod.outcome, draft: eod.draft, streams: JSON.stringify(eod.streams), source, notes };
  return db.eodUpdate.upsert({
    where: { date: today },
    create: { date: today, ...row },
    update: row, // a re-draft the same day replaces the draft
  });
}

export async function composeAndSaveEod(ctx: Ctx, notes: string | null, source: "text" | "voice") {
  const saved = await draftAndSaveEod(ctx.userId, ctx.today, notes, source);
  const streams: string[] = JSON.parse(saved.streams);

  // Draft on its own so it copies cleanly; the confirmation follows separately.
  await ctx.reply(saved.draft);
  await ctx.reply(`Saved as today's EoD${streams.length ? ` · streams: ${streams.join(", ")}` : ""}. Send "draft my update" again to redo it.`);
}

export const draftEod: Handler = async (ctx, parsed) => {
  const notes = (parsed.data.notes as string | null | undefined) ?? null;
  await composeAndSaveEod(ctx, notes, "text");
};
