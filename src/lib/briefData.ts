import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";
import { getTodayHMSession, getRaceCountdown, getCurrentWeekHMStats } from "@/lib/hmTracker";
import { subDays, format, getDay } from "date-fns";
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
  const [todaySession, daysToRace, weekStats] = await Promise.all([
    getTodayHMSession(),
    getRaceCountdown(),
    getCurrentWeekHMStats(),
  ]);

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

// Returns true if today is Sunday (IST)
export function isSundayIST(): boolean {
  return getDay(istNow()) === 0;
}

// Fetch richer data for Sunday weekly coach review
export async function fetchWeekReviewData() {
  const userId = getUserId();
  const today = todayIST();
  const weekStart = subDays(today, 6); // Mon–Sun

  const [
    weekLogs,
    weekReflections,
    weekStrava,
    openTasks,
    weekStats,
    daysToRace,
    todaySession,
  ] = await Promise.all([
    // Full week daily logs
    db.dailyLog.findMany({
      where: { userId, date: { gte: weekStart } },
      orderBy: { date: "asc" },
      select: {
        date: true, rhrBpm: true, hrvMs: true, sleepMin: true,
        moodScore: true, energyLevel: true, stressLevel: true,
        didWorkout: true, didJournal: true, didCode: true,
        didRead: true, didMeditate: true, didNetwork: true, didLearn: true,
      },
    }),

    // Full week journal entries — snippet per day
    db.reflection.findMany({
      where: { userId, type: "daily", date: { gte: weekStart } },
      orderBy: { date: "asc" },
      select: { date: true, journalText: true, lessonsLearned: true, gratitudeItems: true, weeklyScore: true },
    }),

    // Week's Strava runs
    db.stravaActivity.findMany({
      where: { userId, date: { gte: weekStart }, type: { in: ["Run", "TrailRun"] } },
      orderBy: { date: "asc" },
      select: { date: true, name: true, distanceM: true, movingTimeSec: true, avgHeartRate: true },
    }),

    // Open tasks — top 5
    db.task.findMany({
      where: { userId, status: { in: ["todo", "in_progress"] } },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      take: 5,
      select: { title: true, priority: true },
    }),

    getCurrentWeekHMStats(),
    getRaceCountdown(),
    getTodayHMSession(),
  ]);

  // Aggregate vitals
  const logsWithHrv = weekLogs.filter(l => l.hrvMs);
  const avgHrv = logsWithHrv.length
    ? Math.round(logsWithHrv.reduce((s, l) => s + (l.hrvMs ?? 0), 0) / logsWithHrv.length)
    : null;
  const logsWithSleep = weekLogs.filter(l => l.sleepMin);
  const avgSleep = logsWithSleep.length
    ? Math.round(logsWithSleep.reduce((s, l) => s + (l.sleepMin ?? 0), 0) / logsWithSleep.length / 60 * 10) / 10
    : null;
  const logsWithMood = weekLogs.filter(l => l.moodScore);
  const avgMood = logsWithMood.length
    ? Math.round(logsWithMood.reduce((s, l) => s + (l.moodScore ?? 0), 0) / logsWithMood.length * 10) / 10
    : null;

  // Habit counts
  const habitCounts = {
    workout:  weekLogs.filter(l => l.didWorkout).length,
    journal:  weekLogs.filter(l => l.didJournal).length,
    code:     weekLogs.filter(l => l.didCode).length,
    read:     weekLogs.filter(l => l.didRead).length,
    meditate: weekLogs.filter(l => l.didMeditate).length,
  };

  // Weekly km
  const weeklyKm = Math.round(
    weekStrava.reduce((sum, a) => sum + (a.distanceM ?? 0) / 1000, 0) * 10
  ) / 10;

  // Journal snippets — one per day, max 150 chars each
  const journalSnippets = weekReflections
    .filter(r => r.journalText)
    .map(r => ({
      day: format(new Date(r.date), "EEE"),
      text: (r.journalText as string).slice(0, 150),
      score: r.weeklyScore,
    }));

  // Lessons from the week
  const lessons = weekReflections
    .filter(r => r.lessonsLearned)
    .map(r => (r.lessonsLearned as string).slice(0, 100))
    .join(" | ");

  return {
    today: format(istNow(), "EEEE, d MMMM"),
    weekNum: weekStats.weekNum,
    daysToRace,
    todaySession: todaySession ? {
      name: todaySession.name,
      type: todaySession.type,
      targetKm: todaySession.targetKm,
      targetMin: todaySession.targetMin,
    } : null,
    vitals: { avgHrv, avgSleep, avgMood },
    habitCounts,
    weeklyKm,
    weeklyKmTarget: weekStats.targetKm,
    journalSnippets,
    lessons: lessons || null,
    openTasks: openTasks.map(t => t.title),
    runCount: weekStrava.length,
  };
}

// Generate Sunday combined brief + weekly coach review
export async function generateSundayBrief(data: Awaited<ReturnType<typeof fetchWeekReviewData>>): Promise<string> {
  const prompt = `Write Adwait's Sunday morning WhatsApp message. It has two parts: (1) a brief for today, (2) a weekly coach review. Warm, personal, direct. Max 18 lines total. No markdown. Use emojis sparingly.

Data:
- Date: ${data.today}
- Week ${data.weekNum}/25 — ${data.daysToRace} days to Delhi HM
- Today's session: ${data.todaySession ? `${data.todaySession.name}${data.todaySession.targetKm ? ` · ${data.todaySession.targetKm}km` : ""}${data.todaySession.targetMin ? ` · ~${data.todaySession.targetMin}min` : ""}` : "Rest day"}

Week stats:
- Running: ${data.weeklyKm}/${data.weeklyKmTarget ?? "—"} km (${data.runCount} runs)
- Habits: Workout ${data.habitCounts.workout}/7 · Journal ${data.habitCounts.journal}/7 · Code ${data.habitCounts.code}/7 · Read ${data.habitCounts.read}/7 · Meditate ${data.habitCounts.meditate}/7
- Avg HRV: ${data.vitals.avgHrv ?? "—"} · Avg sleep: ${data.vitals.avgSleep ?? "—"}h · Avg mood: ${data.vitals.avgMood ?? "—"}/10
- Journal snippets: ${data.journalSnippets.length > 0 ? data.journalSnippets.map(j => `${j.day}: "${j.text}"`).join(" | ") : "nothing logged"}
- Key lessons: ${data.lessons ?? "none logged"}
- Open tasks: ${data.openTasks.length > 0 ? data.openTasks.join(", ") : "none"}

Rules:
1. Start with "Good morning Adwait 🌅 Sunday, [date]"
2. One line on today's session
3. Blank line, then "── Week ${data.weekNum} Review ──"
4. 2-3 lines: what went well this week (be specific, reference journal/stats)
5. 1-2 lines: what to improve next week (honest, not harsh)
6. 1 line on running progress vs target
7. End with one forward-looking challenge for next week`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 600,
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
