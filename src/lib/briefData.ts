import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";
import { getTodayHMSession, getRaceCountdown, getCurrentWeekHMStats } from "@/lib/hmTracker";
import { subDays, format, getDay, addDays } from "date-fns";
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

  // Detect Monday in IST (getDay: 1 = Monday)
  const isMonday = getDay(istNow()) === 1;
  // Previous week window: Mon–Sun before this week (8–14 days ago)
  const prevWeekEnd = subDays(today, 1);    // yesterday = last Sunday
  const prevWeekStart = subDays(today, 8);  // 8 days ago = last Monday

  const [
    last3Logs,
    yesterdayReflection,
    openTasks,
    last7Strava,
    last7Reflections,
    prevWeekStrava,
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

    // Previous week's runs — only fetched on Monday, null otherwise
    isMonday
      ? db.stravaActivity.findMany({
          where: { userId, date: { gte: prevWeekStart, lte: prevWeekEnd }, type: { in: ["Run", "TrailRun"] } },
          select: { distanceM: true },
        })
      : Promise.resolve(null),
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

  // Previous week total km — used on Monday so belief message isn't anchored to 0
  const lastWeekKm = prevWeekStrava
    ? Math.round(prevWeekStrava.reduce((sum, a) => sum + (a.distanceM ?? 0) / 1000, 0) * 10) / 10
    : null;

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
    isMonday,
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
    lastWeekKm,  // non-null only on Mondays
    habitCounts,
    openTasks: openTasks.slice(0, 5).map(t => t.title),
    recentActivity: last7Strava[0] ? {
      name: last7Strava[0].name,
      type: last7Strava[0].type,
      km: last7Strava[0].distanceM ? Math.round(last7Strava[0].distanceM / 100) / 10 : null,
    } : null,
  };
}

// Fixed persona context — who Adwait actually is, used to make belief messages personal
const ADWAIT_PERSONA = `Who he is:
- Adwait Natekar, 25, based in India
- Works a day job, but building toward launching his own startup — this OS he's building is part of that journey
- Came back from an ITB injury — every km he runs now is a comeback km
- Runs, lifts, codes, reads, journals — doing all of it at once, not sequentially
- Last HM was 2:24. Next race: Vedanta Delhi HM (18 Oct 2026), target sub-2:05. That's 19 minutes off.
- The arc doesn't stop there: after Delhi HM, the goal is a full marathon, then eventually an Ironman
- The belief: he's 25, working a job, training for a sub-2:05 HM, and building a startup on the side. Most people at 25 pick one thing. He's compressing a decade into a year.`;

// Generate a personalized "delusional belief" motivational message
// timeOfDay: "morning" uses yesterday's data; "evening" uses today's data
export async function generateDelusionalBelief(context: {
  activityName?: string | null;
  activityKm?: number | null;
  activityMin?: number | null;
  habitsCompleted?: string[];
  journalSnippet?: string | null;
  moodScore?: number | null;
  weeklyKm?: number | null;
  weeklyKmTarget?: number | null;
  lastWeekKm?: number | null;  // populated on Mondays only
  daysToRace?: number | null;
  completedTasks?: number | null;
  timeOfDay: "morning" | "evening";
  isRestDay?: boolean;
}): Promise<string> {
  const habitsText = context.habitsCompleted && context.habitsCompleted.length > 0
    ? context.habitsCompleted.join(", ")
    : null;

  const activityText = context.activityKm
    ? `${context.activityName ?? "Run"} — ${context.activityKm}km${context.activityMin ? ` in ${context.activityMin}min` : ""}`
    : context.activityName
    ? context.activityName
    : null;

  const isMondayContext = context.lastWeekKm != null;

  const prompt = context.timeOfDay === "morning"
    ? isMondayContext
      ? `${ADWAIT_PERSONA}

Write a 3-4 line motivational message for Adwait's Monday morning WhatsApp brief. New week, fresh slate — but anchor it in what he proved last week. "Chosen one" energy, not generic hype. Reference real numbers. WhatsApp format (no markdown). End with one sharp line about what this week demands.

Last week's data:
- Running total last week: ${context.lastWeekKm}km
- Activity yesterday: ${activityText ?? "rest day (planned)"}
- Habits done: ${habitsText ?? "none logged"}
- Journal: ${context.journalSnippet ? `"${context.journalSnippet}"` : "nothing logged"}
- Days to Delhi HM race: ${context.daysToRace ?? "—"}
- New week target: ${context.weeklyKmTarget ?? "—"} km

Tone: Fierce. Last week's ${context.lastWeekKm}km is the floor, not the ceiling. He's a founder training for a sub-2:05 HM coming back from ITB — Monday is when ordinary people reset and people like him build on what they've already done.`
      : `${ADWAIT_PERSONA}

Write a 3-4 line motivational message for Adwait's morning WhatsApp brief. It should sound like he is the absolute chosen one — delusion-level belief, not generic hype. Reference real numbers from yesterday. WhatsApp format (no markdown). End with one sharp line about what today requires.

Yesterday's data:
- Activity: ${activityText ?? "rest day"}
- Weekly running: ${context.weeklyKm ?? "—"}/${context.weeklyKmTarget ?? "—"} km done
- Habits done: ${habitsText ?? "none logged"}
- Mood: ${context.moodScore ? `${context.moodScore}/10` : "not logged"}
- Journal: ${context.journalSnippet ? `"${context.journalSnippet}"` : "nothing logged"}
- Days to Delhi HM race: ${context.daysToRace ?? "—"}

Tone: Fierce, personal, grounded in the actual data. He's a founder-athlete coming back from ITB, chasing sub-2:05, building a company at the same time. Sound like a coach who knows exactly who this person is and refuses to let him see himself as ordinary.`
    : context.isRestDay
    ? `${ADWAIT_PERSONA}

Write a 3-4 line motivational message for Adwait's evening WhatsApp check-in. Today was a planned rest day. Celebrate the discipline of resting — the best athletes know recovery is part of training. Use the week's cumulative km to anchor it. WhatsApp format (no markdown). End with one line priming him for tomorrow.

Today's data:
- Today: planned rest day
- Weekly running so far: ${context.weeklyKm ?? "—"}/${context.weeklyKmTarget ?? "—"} km
- Habits done today: ${habitsText ?? "none logged"}
- Tasks completed: ${context.completedTasks ?? 0}
- Days to Delhi HM race: ${context.daysToRace ?? "—"}

Tone: Rest days are power moves. A founder-athlete coming back from ITB who refuses to overtrain is playing the long game. Fierce but grounded — not a consolation, a conviction.`
    : `${ADWAIT_PERSONA}

Write a 3-4 line motivational message for Adwait's evening WhatsApp check-in. Celebrate what he actually did today with "chosen one" energy — like he's making history with each day he shows up. WhatsApp format (no markdown). End with one line about tomorrow.

Today's data:
- Activity: ${activityText ?? "no activity logged"}
- Weekly running: ${context.weeklyKm ?? "—"}/${context.weeklyKmTarget ?? "—"} km done
- Habits done today: ${habitsText ?? "none logged"}
- Tasks completed: ${context.completedTasks ?? 0}
- Days to Delhi HM race: ${context.daysToRace ?? "—"}

Tone: Fierce, personal, grounded in what he actually did today. He's building a startup and training for a sub-2:05 HM after an ITB comeback — every km, every habit, every task is proof of what he already is. Make it undeniable.`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 200,
    messages: [{ role: "user", content: prompt }],
  });

  return (response.content[0] as { text: string }).text.trim();
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

  // Run brief + delusional belief in parallel
  const [briefText, beliefText] = await Promise.all([
    anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    }).then(r => (r.content[0] as { text: string }).text.trim()),

    generateDelusionalBelief({
      activityName: data.recentActivity?.name,
      activityKm: data.recentActivity?.km,
      habitsCompleted: [
        ...(data.habitCounts.workout > 0 ? ["workout"] : []),
        ...(data.habitCounts.journal > 0 ? ["journal"] : []),
        ...(data.habitCounts.code > 0 ? ["code"] : []),
        ...(data.habitCounts.read > 0 ? ["read"] : []),
        ...(data.habitCounts.meditate > 0 ? ["meditate"] : []),
      ],
      journalSnippet: data.yesterdayJournal ? data.yesterdayJournal.slice(0, 100) : null,
      weeklyKm: data.weeklyKm,
      weeklyKmTarget: data.weeklyKmTarget,
      lastWeekKm: data.lastWeekKm,
      daysToRace: data.daysToRace,
      timeOfDay: "morning",
    }),
  ]);

  return `${briefText}\n\n🔥 ${beliefText}`;
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

  // Run brief + delusional belief in parallel
  const [briefText, beliefText] = await Promise.all([
    anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    }).then(r => (r.content[0] as { text: string }).text.trim()),

    generateDelusionalBelief({
      weeklyKm: data.weeklyKm,
      weeklyKmTarget: data.weeklyKmTarget,
      habitsCompleted: [
        ...(data.habitCounts.workout > 0 ? [`workout ${data.habitCounts.workout}/7`] : []),
        ...(data.habitCounts.journal > 0 ? [`journal ${data.habitCounts.journal}/7`] : []),
        ...(data.habitCounts.code > 0 ? [`code ${data.habitCounts.code}/7`] : []),
        ...(data.habitCounts.read > 0 ? [`read ${data.habitCounts.read}/7`] : []),
        ...(data.habitCounts.meditate > 0 ? [`meditate ${data.habitCounts.meditate}/7`] : []),
      ],
      journalSnippet: data.journalSnippets[0]?.text ?? null,
      daysToRace: data.daysToRace,
      timeOfDay: "morning",
    }),
  ]);

  return `${briefText}\n\n🔥 ${beliefText}`;
}

// Generate evening nudge — always sends with a motivational belief message + journal prompt
export async function shouldSendNudge(): Promise<{ send: boolean; message: string }> {
  const userId = getUserId();
  const today = todayIST();
  const tomorrow = addDays(today, 1);

  const [todayLog, todayReflection, openTasks, todayStrava, completedTasksCount, daysToRace, weekStats] = await Promise.all([
    db.dailyLog.findFirst({
      where: { userId, date: today },
      select: { didJournal: true, moodScore: true, didWorkout: true, didCode: true, didRead: true, didMeditate: true, didNetwork: true, didLearn: true },
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
    // Today's activity first, fallback to last 3 days if rest day
    db.stravaActivity.findFirst({
      where: { userId, date: { gte: subDays(today, 3), lt: tomorrow }, type: { not: "Walk" } },
      orderBy: { date: "desc" },
      select: { name: true, type: true, date: true, distanceM: true, movingTimeSec: true },
    }),
    db.task.count({
      where: { userId, status: "done", updatedAt: { gte: today, lt: tomorrow } },
    }),
    getRaceCountdown(),
    getCurrentWeekHMStats(),
  ]);

  const hasJournaled = todayReflection?.journalText || todayLog?.didJournal;
  const pendingTasks = openTasks.map(t => `• ${t.title}`).join("\n");

  // Check if the Strava activity is from today or a recent past day (rest day fallback)
  const stravaDate = todayStrava?.date ? format(new Date(todayStrava.date), "yyyy-MM-dd") : null;
  const todayStr = format(today, "yyyy-MM-dd");
  const isRestDay = !stravaDate || stravaDate !== todayStr;

  // Build habits done today
  const habitsCompleted: string[] = [];
  if (todayLog?.didWorkout || (todayStrava && !isRestDay)) habitsCompleted.push("workout");
  if (todayLog?.didCode) habitsCompleted.push("code");
  if (todayLog?.didRead) habitsCompleted.push("read");
  if (todayLog?.didMeditate) habitsCompleted.push("meditate");
  if (todayLog?.didJournal || todayReflection?.journalText) habitsCompleted.push("journal");

  // On rest days, use the week's accumulated km as the anchor for the belief message
  // (most recent activity still passed for reference, but framed differently)
  const beliefText = await generateDelusionalBelief({
    activityName: isRestDay
      ? null  // null signals rest day — prompt will use week cumulative instead
      : todayStrava?.name,
    activityKm: isRestDay
      ? null
      : (todayStrava?.distanceM ? Math.round(todayStrava.distanceM / 100) / 10 : null),
    activityMin: isRestDay
      ? null
      : (todayStrava?.movingTimeSec ? Math.round(todayStrava.movingTimeSec / 60) : null),
    habitsCompleted,
    weeklyKm: weekStats.doneKm,
    weeklyKmTarget: weekStats.targetKm,
    daysToRace,
    completedTasks: completedTasksCount,
    timeOfDay: "evening",
    isRestDay,
  });

  if (!hasJournaled) {
    const parts = [
      `🔥 ${beliefText}`,
      ``,
      `Hey Adwait 👋 End of day check-in!`,
      ``,
      `You haven't journaled today — how did it go? Just reply here.`,
    ];
    if (pendingTasks.length > 0) {
      parts.push(``, `Still open:`, pendingTasks);
    }
    return { send: true, message: parts.join("\n") };
  }

  // Already journaled — send belief + open tasks
  const parts = [
    `🔥 ${beliefText}`,
    ``,
    `Evening check-in ✨`,
  ];
  if (openTasks.length > 0) {
    parts.push(``, `Still open:`, pendingTasks);
  }
  parts.push(``, `Anything to add to today's journal?`);
  return { send: true, message: parts.join("\n") };
}
