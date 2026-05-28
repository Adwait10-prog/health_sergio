import Anthropic from "@anthropic-ai/sdk";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { format } from "date-fns";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

function todayISTStr(): string {
  const now = new Date();
  return new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().split("T")[0];
}

function localKey(d: Date): string {
  return new Date(d.getTime() + 5.5 * 60 * 60 * 1000).toISOString().split("T")[0];
}

export const getPatternInsights = unstable_cache(
  async (userId: string): Promise<string> => {
    // Fetch last 30 days of data
    const since = new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000);

    const [dailyLogs, reflections, stravaActivities, techLogs, founderLogs] = await Promise.all([
      db.dailyLog.findMany({
        where: { userId, date: { gte: since } },
        orderBy: { date: "desc" },
        select: { date: true, moodScore: true, energyLevel: true, sleepMin: true, didWorkout: true, didJournal: true, didCode: true, didNetwork: true, deepWorkMin: true, waterL: true },
      }),
      db.reflection.findMany({
        where: { userId, type: "daily", date: { gte: since } },
        orderBy: { date: "desc" },
        select: { date: true, journalText: true },
      }),
      db.stravaActivity.findMany({
        where: { userId, date: { gte: since } },
        orderBy: { date: "desc" },
        select: { date: true, type: true, distanceM: true, movingTimeSec: true, avgHeartRate: true },
      }),
      db.technicalLog.findMany({
        where: { userId, date: { gte: since } },
        orderBy: { date: "desc" },
        select: { date: true, hoursCodedMin: true, featuresShipped: true },
      }),
      db.founderLog.findMany({
        where: { userId, date: { gte: since } },
        orderBy: { date: "desc" },
        select: { date: true, newPeopleMet: true, linkedinPosts: true },
      }),
    ]);

    if (dailyLogs.length < 5 && stravaActivities.length < 3) {
      return "Keep logging for a few more days — I'll spot your patterns soon 🔍";
    }

    // Build a compact data summary to pass to Claude
    const workoutDays = new Set(stravaActivities.map(a => localKey(a.date)));
    const journalDays = new Set(reflections.filter(r => r.journalText).map(r => localKey(r.date)));

    // Mood on workout vs non-workout days
    const moodOnWorkout    = dailyLogs.filter(l => l.moodScore && workoutDays.has(localKey(l.date))).map(l => l.moodScore!);
    const moodNoWorkout    = dailyLogs.filter(l => l.moodScore && !workoutDays.has(localKey(l.date))).map(l => l.moodScore!);
    const avgMoodWorkout   = moodOnWorkout.length   ? (moodOnWorkout.reduce((a, b) => a + b, 0)   / moodOnWorkout.length).toFixed(1)   : null;
    const avgMoodNoWorkout = moodNoWorkout.length   ? (moodNoWorkout.reduce((a, b) => a + b, 0)   / moodNoWorkout.length).toFixed(1)   : null;

    // Sleep vs energy
    const sleepEnergyPairs = dailyLogs.filter(l => l.sleepMin && l.energyLevel).map(l => ({ sleep: Math.round(l.sleepMin! / 60 * 10) / 10, energy: l.energyLevel! }));
    const goodSleepEnergy  = sleepEnergyPairs.filter(p => p.sleep >= 7).map(p => p.energy);
    const badSleepEnergy   = sleepEnergyPairs.filter(p => p.sleep < 7).map(p => p.energy);
    const avgEnergyGoodSleep = goodSleepEnergy.length ? (goodSleepEnergy.reduce((a, b) => a + b, 0) / goodSleepEnergy.length).toFixed(1) : null;
    const avgEnergyBadSleep  = badSleepEnergy.length  ? (badSleepEnergy.reduce((a, b) => a + b, 0)  / badSleepEnergy.length).toFixed(1)  : null;

    // Streaks
    const totalDays     = 30;
    const workoutCount  = workoutDays.size;
    const journalCount  = journalDays.size;

    // Weekly patterns
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const workoutByDay = Array(7).fill(0);
    stravaActivities.forEach(a => workoutByDay[new Date(a.date).getDay()]++);
    const bestWorkoutDay = dayNames[workoutByDay.indexOf(Math.max(...workoutByDay))];

    // Recent run stats
    const runs = stravaActivities.filter(a => a.type === "Run" || a.type === "TrailRun");
    const avgRunKm = runs.length ? (runs.reduce((s, r) => s + (r.distanceM ?? 0), 0) / runs.length / 1000).toFixed(1) : null;

    const context = `Last 30 days stats for Adwait:
- Workouts: ${workoutCount}/${totalDays} days (most common day: ${bestWorkoutDay})
- Journal entries: ${journalCount}/${totalDays} days
- Mood on workout days: ${avgMoodWorkout ?? "not enough data"}/10 vs non-workout: ${avgMoodNoWorkout ?? "not enough data"}/10
- Energy with ≥7h sleep: ${avgEnergyGoodSleep ?? "not enough data"}/10 vs <7h sleep: ${avgEnergyBadSleep ?? "not enough data"}/10
- Avg run distance: ${avgRunKm ?? "no runs"} km (${runs.length} runs)
- Tech logs: ${techLogs.length} days logged
- Networking logs: ${founderLogs.length} days logged
- Today: ${todayISTStr()}`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `You are Adwait's personal coach. Based on his last 30 days of data, give him 2 short coach-style insights. Be specific with numbers. Be direct and motivating — like a coach, not a bot. No markdown, no bullet points, no emojis. Max 3 sentences total. Start with the most interesting pattern.

${context}`,
      }],
    });

    return (response.content[0] as { text: string }).text.trim();
  },
  ["pattern-insights"],
  {
    revalidate: 3600, // cache for 1 hour
    tags: ["pattern-insights"],
  }
);
