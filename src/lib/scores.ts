import type { DailyLogModel } from "@/generated/prisma/models/DailyLog";
import type { TechnicalLogModel } from "@/generated/prisma/models/TechnicalLog";
import type { FounderLogModel } from "@/generated/prisma/models/FounderLog";

export function calcDisciplineScore(log: DailyLogModel | null): number {
  if (!log) return 0;
  let score = 0;
  if ((log.sleepMin ?? 0) >= 420) score += 25;
  if (log.didWorkout) score += 25;
  if ((log.deepWorkMin ?? 0) >= 180) score += 25;
  const habits = [log.didRead, log.didCode, log.didJournal, log.didMeditate, log.didNetwork, log.didLearn];
  score += Math.round((habits.filter(Boolean).length / 6) * 25);
  return score;
}

export function calcMomentumScore(log: DailyLogModel | null): number {
  if (!log) return 0;
  const discipline = calcDisciplineScore(log);
  const taskPct = log.tasksPlanned
    ? Math.min(100, Math.round(((log.tasksCompleted ?? 0) / log.tasksPlanned) * 100))
    : 0;
  const learningBonus = log.didLearn ? 20 : 0;
  const networkBonus = log.didNetwork ? 20 : 0;
  return Math.min(100, Math.round(discipline * 0.4 + taskPct * 0.2 + learningBonus + networkBonus));
}

export function scoreColor(score: number): string {
  if (score >= 70) return "var(--accent)";
  if (score >= 40) return "var(--gold)";
  return "var(--warn)";
}

export function calcHabitStreak(logs: DailyLogModel[], field: keyof DailyLogModel): number {
  let streak = 0;
  for (const log of logs) {
    if (log[field]) streak++;
    else break;
  }
  return streak;
}

export function calcWeeklyFounderScore(logs: FounderLogModel[]): number {
  if (!logs.length) return 0;
  const totalNetwork  = logs.reduce((s, l) => s + (l.newPeopleMet ?? 0) + (l.highValueConnections ?? 0), 0);
  const totalStartup  = logs.reduce((s, l) => s + (l.ideasResearched ?? 0) + (l.validationCalls ?? 0) + (l.pitchesPrepared ?? 0), 0);
  const totalContent  = logs.reduce((s, l) => s + (l.linkedinPosts ?? 0), 0);
  const totalOutreach = logs.reduce((s, l) => s + (l.investorOutreach ?? 0) + (l.followUpsDone ?? 0), 0);
  const networkScore  = Math.min(100, (totalNetwork  / 5)  * 100); // target 5/wk
  const startupScore  = Math.min(100, (totalStartup  / 5)  * 100); // target 5/wk
  const contentScore  = Math.min(100, (totalContent  / 3)  * 100); // target 3 posts/wk
  const outreachScore = Math.min(100, (totalOutreach / 5)  * 100); // target 5/wk
  return Math.round((networkScore + startupScore + contentScore + outreachScore) / 4);
}

export function calcWeeklyCTOScore(logs: TechnicalLogModel[]): number {
  if (!logs.length) return 0;
  const totalHours = logs.reduce((s, l) => s + (l.hoursCodedMin ?? 0), 0) / 60;
  const totalFeatures = logs.reduce((s, l) => s + (l.featuresShipped ?? 0), 0);
  const totalAI = logs.reduce((s, l) => s + (l.aiAgentsBuilt ?? 0) + (l.promptsEngineered ?? 0), 0);
  const totalDesigns = logs.reduce((s, l) => s + (l.systemDesignsDone ?? 0), 0);
  const hoursScore   = Math.min(100, (totalHours    / 20)  * 100); // target 20h/wk
  const featScore    = Math.min(100, (totalFeatures / 5)   * 100); // target 5/wk
  const aiScore      = Math.min(100, (totalAI       / 10)  * 100); // target 10/wk
  const designScore  = Math.min(100, (totalDesigns  / 2)   * 100); // target 2/wk
  return Math.round((hoursScore + featScore + aiScore + designScore) / 4);
}
