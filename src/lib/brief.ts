import { db } from "./db";
import { getUserId } from "./user";
import { calcDisciplineScore, calcMomentumScore, calcWeeklyCTOScore, calcWeeklyFounderScore } from "./scores";
import { startOfDay, subDays, startOfWeek, format } from "date-fns";
import type { DailyLogModel } from "@/generated/prisma/models/DailyLog";

const HABIT_LABELS: Record<string, string> = {
  didWorkout:  "Workout",
  didRead:     "Read",
  didCode:     "Code",
  didJournal:  "Journal",
  didMeditate: "Meditate",
  didNetwork:  "Network",
  didLearn:    "Learn",
};

function fmtInr(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n}`;
}

function missedHabits(log: DailyLogModel): string[] {
  return Object.keys(HABIT_LABELS).filter(
    (k) => !log[k as keyof DailyLogModel]
  );
}

export async function generateBrief(): Promise<string> {
  const userId = getUserId();
  const today     = startOfDay(new Date());
  const yesterday = subDays(today, 1);
  const weekStart = startOfDay(startOfWeek(today, { weekStartsOn: 1 }));

  const [
    yesterdayLog,
    weekTechLogs,
    weekFounderLogs,
    latestFinance,
    last7Logs,
  ] = await Promise.all([
    db.dailyLog.findFirst({ where: { userId, date: yesterday } }),
    db.technicalLog.findMany({ where: { userId, date: { gte: weekStart } } }),
    db.founderLog.findMany({ where: { userId, date: { gte: weekStart } } }),
    db.financeLog.findFirst({ where: { userId }, orderBy: { date: "desc" } }),
    db.dailyLog.findMany({
      where: { userId, date: { gte: subDays(today, 7) } },
      orderBy: { date: "desc" },
    }),
  ]);

  const discipline = calcDisciplineScore(yesterdayLog);
  const momentum   = calcMomentumScore(yesterdayLog);
  const ctoScore   = calcWeeklyCTOScore(weekTechLogs);
  const founderScore = calcWeeklyFounderScore(weekFounderLogs);

  // Yesterday's execution section
  const deepWorkH = yesterdayLog
    ? ((yesterdayLog.deepWorkMin ?? 0) / 60).toFixed(1)
    : "0";
  const tasksStr = yesterdayLog
    ? `${yesterdayLog.tasksCompleted ?? 0}/${yesterdayLog.tasksPlanned ?? 0}`
    : "0/0";
  const habitsTotal = Object.keys(HABIT_LABELS).length;
  const habitsDone = yesterdayLog
    ? Object.keys(HABIT_LABELS).filter((k) => yesterdayLog[k as keyof DailyLogModel]).length
    : 0;
  const missed = yesterdayLog ? missedHabits(yesterdayLog) : Object.keys(HABIT_LABELS);
  const missedStr = missed.map((k) => HABIT_LABELS[k]).join(", ") || "none";

  // Technical section
  const totalHoursCodedH = (weekTechLogs.reduce((s, l) => s + (l.hoursCodedMin ?? 0), 0) / 60).toFixed(1);
  const totalFeatures = weekTechLogs.reduce((s, l) => s + (l.featuresShipped ?? 0), 0);
  const totalAI = weekTechLogs.reduce((s, l) => s + (l.aiAgentsBuilt ?? 0) + (l.promptsEngineered ?? 0), 0);
  const totalPRs = weekTechLogs.reduce((s, l) => s + (l.prsMerged ?? 0), 0);

  // Founder section
  const totalNetwork = weekFounderLogs.reduce((s, l) => s + (l.newPeopleMet ?? 0) + (l.highValueConnections ?? 0), 0);
  const totalStartupActions = weekFounderLogs.reduce((s, l) => s + (l.ideasResearched ?? 0) + (l.validationCalls ?? 0) + (l.pitchesPrepared ?? 0), 0);
  // LinkedIn: use latest entry this week
  const latestFounder = weekFounderLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  const linkedinFollowers = latestFounder?.linkedinFollowers ?? null;
  const prevWeekFounder   = await db.founderLog.findFirst({
    where: { userId, date: { gte: subDays(weekStart, 7), lt: weekStart } },
    orderBy: { date: "desc" },
  });
  const linkedinDelta = linkedinFollowers != null && prevWeekFounder?.linkedinFollowers != null
    ? linkedinFollowers - prevWeekFounder.linkedinFollowers
    : null;

  // Flags
  const flags: string[] = [];
  const sleepLogs = last7Logs.filter((l) => (l.sleepMin ?? 0) < 360);
  if (sleepLogs.length >= 3) flags.push(`Low sleep ≥3 of last 7 nights (avg ${Math.round(sleepLogs.reduce((s, l) => s + (l.sleepMin ?? 0), 0) / sleepLogs.length / 60 * 10) / 10}h)`);
  const noDeepWork = last7Logs.filter((l) => (l.deepWorkMin ?? 0) === 0);
  if (noDeepWork.length >= 3) flags.push(`No deep work logged for ${noDeepWork.length} of last 7 days`);
  if (discipline < 30) flags.push("Discipline score critically low — review habits");
  if (ctoScore < 20 && weekTechLogs.length === 0) flags.push("No technical log entries this week");
  if (founderScore < 20 && weekFounderLogs.length === 0) flags.push("No founder log entries this week");

  // Auto question — pick worst area
  let question = "What is the one lever you can pull this week to move the needle most?";
  if (discipline < 40) question = "Your discipline is low — what specific habit can you lock in tomorrow?";
  else if (ctoScore < 30) question = "Technical output is low this week — what's blocking your deep coding work?";
  else if (founderScore < 30) question = "Founder activities are low — what's one founder action you can do today?";

  const dateStr = format(new Date(), "EEEE, d MMMM yyyy");

  return `# Adwait — Personal OS brief (${dateStr})

## Yesterday's execution
- Discipline Score: ${discipline}/100 | Momentum Score: ${momentum}/100
- Deep work: ${deepWorkH}h | Tasks: ${tasksStr}
- Habits: ${habitsDone}/${habitsTotal} — missed: ${missedStr}
- Mood: ${yesterdayLog?.moodScore ?? "—"}/10, Stress: ${yesterdayLog?.stressLevel ?? "—"}/10

## Technical output (this week)
- Hours coded: ${totalHoursCodedH}h | Features shipped: ${totalFeatures}
- AI experiments: ${totalAI} | PRs merged: ${totalPRs}
- CTO Score: ${ctoScore}/100

## Founder (this week)
- Connections: ${totalNetwork} | Startup actions: ${totalStartupActions}
- LinkedIn: ${linkedinFollowers ?? "—"} followers${linkedinDelta != null ? ` (${linkedinDelta >= 0 ? "+" : ""}${linkedinDelta} vs last week)` : ""}
- Founder Score: ${founderScore}/100

## Finance (latest snapshot)
- Net worth: ${fmtInr(latestFinance?.netWorthInr ?? null)} | Runway: ${latestFinance?.personalRunwayMonths != null ? `${latestFinance.personalRunwayMonths} months` : "—"}
- Savings this month: ${fmtInr(latestFinance?.monthlySavingsInr ?? null)}

## Flags
${flags.length ? flags.map((f) => `- ${f}`).join("\n") : "- None"}

## Question
${question}`;
}
