// journal · gratitude · lessons · mood · water · habits
import type { Handler } from "./types";
import { patchDailyLog, timeLabelIST, todayReflection, upsertReflection } from "../store";

export const journal: Handler = async (ctx, parsed) => {
  const d = parsed.data;
  const newJournalText = d.journalText        as string | null;
  const newGratitude   = d.extractedGratitude as string | null;
  const newLessons     = d.extractedLessons   as string | null;

  // Append to today's entry rather than overwrite
  const existing = await todayReflection(ctx);

  let journalText = newJournalText;
  if (existing?.journalText && newJournalText) {
    journalText = `${existing.journalText as string}\n\n[${timeLabelIST()}] ${newJournalText}`;
  }

  let gratitudeItems = newGratitude;
  if (existing?.gratitudeItems && newGratitude) gratitudeItems = `${existing.gratitudeItems as string}\n${newGratitude}`;
  else if (existing?.gratitudeItems && !newGratitude) gratitudeItems = existing.gratitudeItems as string;

  let lessonsLearned = newLessons;
  if (existing?.lessonsLearned && newLessons) lessonsLearned = `${existing.lessonsLearned as string}\n${newLessons}`;
  else if (existing?.lessonsLearned && !newLessons) lessonsLearned = existing.lessonsLearned as string;

  await upsertReflection(ctx, { journalText, gratitudeItems, lessonsLearned, weeklyScore: d.dayScore as number | null });
  await patchDailyLog(ctx, {
    didJournal: true,
    moodScore:   d.moodScore   as number | null,
    stressLevel: d.stressLevel as number | null,
    energyLevel: d.energyLevel as number | null,
  });
  await ctx.reply(parsed.reply);
};

export const gratitude: Handler = async (ctx, parsed) => {
  const newItems = parsed.data.items as string;
  const existing = await todayReflection(ctx);
  const gratitudeItems = existing?.gratitudeItems ? `${existing.gratitudeItems as string}\n${newItems}` : newItems;
  await upsertReflection(ctx, { gratitudeItems });
  await patchDailyLog(ctx, { didJournal: true });
  await ctx.reply(parsed.reply);
};

export const lessons: Handler = async (ctx, parsed) => {
  const newText = parsed.data.text as string;
  const existing = await todayReflection(ctx);
  const lessonsLearned = existing?.lessonsLearned ? `${existing.lessonsLearned as string}\n${newText}` : newText;
  await upsertReflection(ctx, { lessonsLearned });
  await ctx.reply(parsed.reply);
};

export const mood: Handler = async (ctx, parsed) => {
  const d = parsed.data;
  await patchDailyLog(ctx, {
    moodScore:   d.moodScore   as number | null,
    stressLevel: d.stressLevel as number | null,
    energyLevel: d.energyLevel as number | null,
  });
  await ctx.reply(parsed.reply);
};

export const water: Handler = async (ctx, parsed) => {
  await patchDailyLog(ctx, { waterL: parsed.data.waterL as number });
  await ctx.reply(parsed.reply);
};

const HABIT_FIELDS = {
  read: "didRead", meditate: "didMeditate", code: "didCode",
  learn: "didLearn", network: "didNetwork", journal: "didJournal",
} as const;

export const habits: Handler = async (ctx, parsed) => {
  const done = (parsed.data.done as string[]) ?? [];
  const update: Partial<Record<(typeof HABIT_FIELDS)[keyof typeof HABIT_FIELDS], boolean>> = {};
  for (const [habit, field] of Object.entries(HABIT_FIELDS)) {
    if (done.includes(habit)) update[field] = true;
  }
  if (Object.keys(update).length > 0) await patchDailyLog(ctx, update);
  await ctx.reply(parsed.reply);
};
