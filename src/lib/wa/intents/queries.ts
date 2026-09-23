// query_today · query_week · query_run · query_memory
import Anthropic from "@anthropic-ai/sdk";
import { subDays } from "date-fns";
import type { Handler } from "./types";
import { db } from "../../db";
import { generateWeekSummary } from "../../whatsapp";
import { queryMemory as runMemoryQuery } from "../../memoryQuery";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export const queryToday: Handler = async (ctx) => {
  const [log, reflection] = await Promise.all([
    db.dailyLog.findFirst({ where: { userId: ctx.userId, date: ctx.today } }),
    db.reflection.findFirst({ where: { userId: ctx.userId, date: ctx.today, type: "daily" } }),
  ]);

  const habits = [
    log?.didWorkout  && "💪 Workout",
    log?.didRead     && "📖 Read",
    log?.didCode     && "💻 Code",
    log?.didJournal  && "✍️ Journal",
    log?.didMeditate && "🧘 Meditate",
    log?.didNetwork  && "🤝 Network",
    log?.didLearn    && "🎓 Learn",
  ].filter(Boolean);

  let reply = habits.length > 0 ? `Today so far ✨\n${habits.join(" · ")}` : "Nothing logged yet today, Adwait.";
  if (log?.moodScore) reply += `\n😊 Mood: ${log.moodScore}/10`;
  if (log?.waterL)    reply += ` · 💧 Water: ${log.waterL}L`;
  if (reflection?.journalText) {
    const text = reflection.journalText as string;
    reply += `\n✍️ "${text.slice(0, 80)}${text.length > 80 ? "…" : ""}"`;
  }
  await ctx.reply(reply);
};

export const queryWeek: Handler = async (ctx) => {
  const weekStart = subDays(ctx.today, 7);
  const [reflections, dailyLogs] = await Promise.all([
    db.reflection.findMany({ where: { userId: ctx.userId, type: "daily", date: { gte: weekStart } }, orderBy: { date: "desc" } }),
    db.dailyLog.findMany({ where: { userId: ctx.userId, date: { gte: weekStart } }, orderBy: { date: "desc" } }),
  ]);
  const summary = await generateWeekSummary(
    reflections.map(r => ({ date: r.date, journalText: r.journalText, weeklyScore: r.weeklyScore })),
    dailyLogs.map(l => ({ date: l.date, moodScore: l.moodScore, didWorkout: l.didWorkout, didJournal: l.didJournal })),
  );
  await ctx.reply(summary);
};

export const queryMemory: Handler = async (ctx, parsed) => {
  const d = parsed.data;
  const answer = await runMemoryQuery({
    keywords: (d.keywords as string[]) ?? [],
    dateHint: (d.dateHint as "recent" | "this_week" | "last_week" | "this_month" | null) ?? null,
    scope:    (d.scope as "meetings" | "journal" | "tasks" | "all") ?? "all",
    originalQuestion: ctx.text,
  });
  await ctx.reply(answer);
};

export const queryRun: Handler = async (ctx) => {
  const run = await db.stravaActivity.findFirst({
    where: { userId: ctx.userId, type: { in: ["Run", "TrailRun"] } },
    orderBy: { date: "desc" },
  });
  if (!run) {
    await ctx.reply("No runs found in your recent Strava activities. Sync Strava first if you just finished a run 🏃");
    return;
  }

  const distKm     = run.distanceM ? (run.distanceM / 1000).toFixed(2) : null;
  const movingMin  = run.movingTimeSec ? Math.floor(run.movingTimeSec / 60) : null;
  const movingSec  = run.movingTimeSec ? run.movingTimeSec % 60 : null;
  const pace = run.distanceM && run.movingTimeSec
    ? (() => {
        const secPerKm = run.movingTimeSec / (run.distanceM / 1000);
        return `${Math.floor(secPerKm / 60)}:${String(Math.round(secPerKm % 60)).padStart(2, "0")} /km`;
      })()
    : null;
  const elapsedMin = run.elapsedTimeSec ? Math.floor(run.elapsedTimeSec / 60) : null;
  const speedKmh   = run.avgSpeedMps ? (run.avgSpeedMps * 3.6).toFixed(1) : null;

  let extra: Record<string, unknown> = {};
  try { extra = JSON.parse(run.rawJson); } catch {}

  const splits = extra.splits_metric as Array<{ distance: number; moving_time: number; average_heartrate?: number }> | undefined;
  const splitsText = splits?.slice(0, 15).map((s, i) => {
    const p = s.moving_time / (s.distance / 1000);
    return `km ${i + 1}: ${Math.floor(p / 60)}:${String(Math.round(p % 60)).padStart(2, "0")}${s.average_heartrate ? ` @ ${Math.round(s.average_heartrate)}bpm` : ""}`;
  }).join(", ");

  type BestEffort = { name: string; moving_time: number; distance: number };
  const effortNames = ["1 kilometer", "1 mile", "2 kilometer", "5 kilometer", "10 kilometer", "Half-Marathon"];
  const bestEffortsText = (extra.best_efforts as BestEffort[] | undefined)
    ?.filter(e => effortNames.includes(e.name))
    .map(e => `${e.name}: ${Math.floor(e.moving_time / 60)}:${String(e.moving_time % 60).padStart(2, "0")}`)
    .join(", ");

  const cadence = extra.average_cadence as number | undefined;
  const cadenceText = cadence ? `${Math.round(cadence * 2)} spm` : null; // Strava stores one-foot cadence
  const perceivedExertion = extra.perceived_exertion as number | undefined;
  const deviceName  = extra.device_name as string | undefined;
  const description = extra.description as string | undefined;

  const context = [
    `Run: ${run.name}`,
    `Date: ${new Date(run.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}`,
    distKm             && `Distance: ${distKm} km`,
    movingMin !== null && `Moving time: ${movingMin}m ${movingSec}s`,
    elapsedMin !== null && movingMin !== null && elapsedMin > movingMin && `Elapsed time: ${elapsedMin}m (${elapsedMin - movingMin}m stopped)`,
    pace               && `Avg pace: ${pace}`,
    speedKmh           && `Avg speed: ${speedKmh} km/h`,
    run.avgHeartRate   && `Avg HR: ${run.avgHeartRate} bpm`,
    run.maxHeartRate   && `Max HR: ${run.maxHeartRate} bpm`,
    run.totalElevationM && `Elevation: ${run.totalElevationM}m gain`,
    run.calories       && `Calories: ${run.calories} kcal`,
    run.sufferScore    && `Suffer score: ${run.sufferScore}`,
    cadenceText        && `Cadence: ${cadenceText}`,
    perceivedExertion  && `Perceived exertion: ${perceivedExertion}/10`,
    deviceName         && `Device: ${deviceName}`,
    description        && `Notes: ${description}`,
    bestEffortsText    && `Best efforts — ${bestEffortsText}`,
    splitsText         && `Per-km splits — ${splitsText}`,
  ].filter(Boolean).join("\n");

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 350,
    messages: [{
      role: "user",
      content: `You are Adwait's running coach. Analyse this run and give him sharp, specific feedback in 4-5 lines max. WhatsApp format, no markdown. Be direct — what went well, what the numbers say, one thing to improve or watch. Reference actual numbers.

${context}`,
    }],
  });
  await ctx.reply((response.content[0] as { text: string }).text.trim());
};
