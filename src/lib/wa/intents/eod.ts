// draft_eod — compose today's EoD update and store it as the day's work record
import type { Handler } from "./types";
import type { Ctx } from "../context";
import { db } from "../../db";
import { composeEod, fetchTodayActivity } from "../../eod";

export async function composeAndSaveEod(ctx: Ctx, notes: string | null, source: "text" | "voice") {
  const activity = await fetchTodayActivity(ctx.userId, ctx.today);
  const eod = await composeEod(activity, notes);

  const row = { outcome: eod.outcome, draft: eod.draft, streams: JSON.stringify(eod.streams), source, notes };
  await db.eodUpdate.upsert({
    where: { date: ctx.today },
    create: { date: ctx.today, ...row },
    update: row, // a re-draft the same day replaces the draft
  });

  // Draft on its own so it copies cleanly; the confirmation follows separately.
  await ctx.reply(eod.draft);
  await ctx.reply(`Saved as today's EoD${eod.streams.length ? ` · streams: ${eod.streams.join(", ")}` : ""}. Send "draft my update" again to redo it.`);
}

export const draftEod: Handler = async (ctx, parsed) => {
  const notes = (parsed.data.notes as string | null | undefined) ?? null;
  await composeAndSaveEod(ctx, notes, "text");
};
