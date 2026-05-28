import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";
import { getTodayHMSession, getRaceCountdown, getCurrentWeekHMStats } from "@/lib/hmTracker";
import { subDays, format } from "date-fns";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

function todayIST(): Date {
  const now = new Date();
  const istMs = now.getTime() + 5.5 * 60 * 60 * 1000;
  const dateStr = new Date(istMs).toISOString().split("T")[0];
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - 5.5 * 60 * 60 * 1000);
}

function istNow(): Date {
  return new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);
}

// Efficiently fetch only what morning brief needs — tight window, aggregated
export async function fetchBriefData() {
  const userId = getUserId();
  const today = todayIST();
  const yesterday = subDays(today, 1);
  const last3Start = subDays(today, 3);
  const weekStart = subDays(today, 7);

  const [
    last3Logs,
    yesterdayReflection,
    openTasks,
    last7Strava,
    last7Reflections,
  ] = await Promise.all([
    // Last 3 days vitals — enough for trend, not too much
    db.dailyLog.findMany({
      where: { userId, date: { gte: last3Start } },
      orderBy: { date: "desc" },
      select: {
        date: true,
        rhrBpm: true,
        hrvMs: true,
        sleepMin: true,
        moodScore: true,
        energyLevel: true,
        stressLevel: true,
        waterL: true,
        didWorkout: true,
        didJournal: true,
        didCode: true,
        didRead: true,
        didMeditate: true,
        didNetwork: true,
        didLearn: true,
      },
    }),

    // Yesterday's journal only — not full history
    db.reflection.findFirst({
      where: { userId, date: yesterday, type: "daily" },
      select: { journalText: true, lessonsLearned: true, gratitudeItems: true, weeklyScore: true },
    }),

    // Open tasks — only today's + overdue, max 10
    db.task.findMany({
      where: { userId, status: { in: ["todo", "in_progress"] } },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      take: 10,
      select: { title: true, priority: true, section: true, dueDate: true },
    }),

    // Last 7 Strava activities for weekly km
    db.stravaActivity.findMany({
      where: { userId, date: { gte: weekStart }, type: { not: "Walk" } },
      orderBy: { date: "desc" },
      take: 10,
      select: { name: true, type: true, date: true, distanceM: true, movingTimeSec: true, avgHeartRate: true },
    }),

    // Last 7 reflections for streak count only
    db.reflection.findMany({
      where: { userId, type: "daily", date: { gte: weekStart } },
      select: { date: true },
    }),
  ]);

  // Aggregate — don't pass raw rows to Claude
  const todayLog = last3Logs.find(l => {
    const lDate = format(new Date(l.date), "yyyy-MM-dd");
    const tDate = format(today, "yyyy-MM-dd");
    return lDate === tDate;
  });
  const yesterdayLog = last3Logs.find(l => {
    const lDate = format(new Date(l.date), "yyyy-MM-dd");
    const yDate = format(yesterday, "yyyy-MM-dd");
    return lDate === yDate;
  });

  const weeklyKm = last7Strava
    .filter(a => a.type === "Run" || a.type === "TrailRun")
    .reduce((sum, a) => sum + (a.distanceM ?? 0) / 1000, 0);

  const journalStreak = last7Reflections.length;

  // HM training data
  const todaySession = getTodayHMSession();
  const daysToRace = getRaceCountdown();
  const weekStats = getCurrentWeekHMStats();

  // Habit streak summary (just counts, not full history)
  const habitCounts = {
    workout: last3Logs.filter(l => l.didWorkout).length,
    journal: journalStreak,
    code:    last3Logs.filter(l => l.didCode).length,
    read:    last3Logs.filter(l => l.didRead).length,
    meditate:last3Logs.filter(l => l.didMeditate).length,
  };

  return {
    today: format(istNow(), "EEEE, d MMMM"),
    daysToRace,
    weekNum: weekStats.weekNum,
    todaySession: todaySession ? {
      name: todaySession.name,
      type: todaySession.type,
      targetKm: todaySession.targetKm,
      targetMin: todaySession.targetMin,
      isLogged: !!todaySession.logStatus,
    } : null,
    vitals: yesterdayLog ? {
      hrv:    yesterdayLog.hrvMs,
      rhr:    yesterdayLog.rhrBpm,
      sleep:  yesterdayLog.sleepMin ? Math.round(yesterdayLog.sleepMin / 60 * 10) / 10 : null,
      mood:   yesterdayLog.moodScore,
      energy: yesterdayLog.energyLevel,
    } : todayLog ? {
      hrv:    todayLog.hrvMs,
      rhr:    todayLog.rhrBpm,
      sleep:  todayLog.sleepMin ? Math.round(todayLog.sleepMin / 60 * 10) / 10 : null,
      mood:   null,
      energy: null,
    } : null,
    yesterdayJournal: yesterdayReflection?.journalText
      ? (yesterdayReflection.journalText as string).slice(0, 300)
      : null,
    weeklyKm: Math.round(weeklyKm * 10) / 10,
    weeklyKmTarget: weekStats.targetKm,
    habitCounts,
    openTasks: openTasks.slice(0, 5).map(t => t.title),
    recentActivity: last7Strava[0] ? {
      name: last7Strava[0].name,
      type: last7Strava[0].type,
      km: last7Strava[0].distanceM ? Math.round(last7Strava[0].distanceM / 100) / 10 : null,
    } : null,
  };
}

// Generate morning brief using tight data blob
export async function generateMorningBrief(data: Awaited<ReturnType<typeof fetchBriefData>>): Promise<string> {
  const prompt = `Write Adwait's morning WhatsApp brief. Warm, personal, coach-like. Max 10 lines. No markdown. Use emojis sparingly.

Data:
- Date: ${data.today}
- Days to Delhi HM race: ${data.daysToRace} (Week ${data.weekNum}/25)
- Today's training: ${data.todaySession ? `${data.todaySession.name}${data.todaySession.targetKm ? ` · ${data.todaySession.targetKm}km` : ""}${data.todaySession.targetMin ? ` · ~${data.todaySession.targetMin}min` : ""}` : "Rest day"}
- Vitals: HRV ${data.vitals?.hrv ?? "—"}, RHR ${data.vitals?.rhr ?? "—"}, Sleep ${data.vitals?.sleep ?? "—"}h
- Weekly km: ${data.weeklyKm}/${data.weeklyKmTarget ?? "—"} km
- Journal streak: ${data.habitCounts.journal}/7 days this week
- Yesterday's journal: ${data.yesterdayJournal ?? "nothing logged"}
- Open tasks: ${data.openTasks.length > 0 ? data.openTasks.join(", ") : "none"}

Rules:
1. Start with "Good morning Adwait 🌅" and the date
2. One line on today's training with any recovery note if HRV/RHR warrants it
3. One line referencing something from yesterday's journal if available (make it personal)
4. One line on top open task if any
5. End with one sharp focus question or challenge for the day`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });

  return (response.content[0] as { text: string }).text.trim();
}

// Generate evening nudge — check if journaled today
export async function shouldSendNudge(): Promise<{ send: boolean; message: string }> {
  const userId = getUserId();
  const today = todayIST();

  const [todayLog, todayReflection, openTasks] = await Promise.all([
    db.dailyLog.findFirst({
      where: { userId, date: today },
      select: { didJournal: true, moodScore: true, didWorkout: true },
    }),
    db.reflection.findFirst({
      where: { userId, date: today, type: "daily" },
      select: { journalText: true },
    }),
    db.task.findMany({
      where: { userId, status: { in: ["todo", "in_progress"] } },
      orderBy: { priority: "asc" },
      take: 3,
      select: { title: true },
    }),
  ]);

  const hasJournaled = todayReflection?.journalText || todayLog?.didJournal;
  const habitsNotDone = [];
  if (!todayLog?.didWorkout) habitsNotDone.push("workout");

  // Build nudge
  const pendingTasks = openTasks.map(t => `• ${t.title}`).join("\n");

  if (!hasJournaled) {
    const message = `Hey Adwait 👋 End of day check-in!\n\nYou haven't journaled today — how did it go? Just reply here.\n\n${pendingTasks.length > 0 ? `Open tasks:\n${pendingTasks}` : ""}`.trim();
    return { send: true, message };
  }

  // Already journaled — send lighter nudge with open tasks
  if (openTasks.length > 0) {
    const message = `Evening check-in ✨\n\nStill open:\n${pendingTasks}\n\nAnything to add to today's journal?`;
    return { send: true, message };
  }

  return { send: false, message: "" };
}
