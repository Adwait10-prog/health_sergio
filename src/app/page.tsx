import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";
import { calcDisciplineScore, calcMomentumScore, calcWeeklyCTOScore, calcWeeklyFounderScore } from "@/lib/scores";
import { startOfDay, startOfWeek, subDays, format } from "date-fns";
import { getTodayHMSession, getCurrentWeekHMStats, getRaceCountdown } from "@/lib/hmTracker";
import ScoreRing from "@/components/today/ScoreRing";
import HabitStreaks from "@/components/today/HabitStreaks";
import DeepWorkTimer from "@/components/today/DeepWorkTimer";
import QuickLog from "@/components/today/QuickLog";
import YesterdayRecap from "@/components/today/YesterdayRecap";
import FitnessPanel from "@/components/today/FitnessPanel";
import TaskList from "@/components/tasks/TaskList";
import CoachBriefModal from "@/components/modals/CoachBriefModal";
import ImportResponseModal from "@/components/modals/ImportResponseModal";
import LiveClock from "@/components/today/LiveClock";

export const dynamic = "force-dynamic";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function localKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function TodayPage() {
  const userId = getUserId();
  const today = startOfDay(new Date());
  const yesterday = subDays(today, 1);
  const weekStart = startOfDay(startOfWeek(today, { weekStartsOn: 1 }));
  const last7Start = subDays(today, 7);
  const last28Start = subDays(today, 28);

  const [
    yesterdayLog,
    last7Logs,
    todayTasks,
    weekTechLogs,
    weekFounderLogs,
    last7TechLogs,
    last7FounderLogs,
    last7Strava,
    last28Strava,
  ] = await Promise.all([
    db.dailyLog.findFirst({ where: { userId, date: yesterday } }),
    db.dailyLog.findMany({
      where: { userId, date: { gte: last7Start } },
      orderBy: { date: "desc" },
    }),
    db.task.findMany({
      where: { userId, isToday: true, status: { not: "cancelled" } },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    }),
    db.technicalLog.findMany({ where: { userId, date: { gte: weekStart } } }),
    db.founderLog.findMany({ where: { userId, date: { gte: weekStart } } }),
    db.technicalLog.findMany({ where: { userId, date: { gte: last7Start } } }),
    db.founderLog.findMany({ where: { userId, date: { gte: last7Start } } }),
    db.stravaActivity.findMany({
      where: { userId, date: { gte: last7Start } },
      orderBy: { date: "desc" },
    }),
    db.stravaActivity.findMany({
      where: { userId, date: { gte: last28Start } },
      orderBy: { date: "desc" },
    }),
  ]);

  const disciplineScore = calcDisciplineScore(yesterdayLog);
  const momentumScore   = calcMomentumScore(yesterdayLog);
  const ctoScore        = calcWeeklyCTOScore(weekTechLogs);
  const founderScore    = calcWeeklyFounderScore(weekFounderLogs);

  // HM Tracker data (synchronous SQLite reads)
  const todayHMSession    = getTodayHMSession();
  const weekHMStats       = getCurrentWeekHMStats();
  const raceCountdown     = getRaceCountdown();

  // Build 4-week buckets for fitness bar chart
  // Each bucket = Mon–Sun week, label = "Wk N"
  type WeekBucket = { label: string; km: number; targetKm: number };
  const weekBuckets: WeekBucket[] = [];
  for (let w = 3; w >= 0; w--) {
    const wStart = startOfDay(startOfWeek(subDays(today, w * 7), { weekStartsOn: 1 }));
    const wEnd   = new Date(wStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const wActivities = last28Strava.filter(
      (a) => a.date >= wStart && a.date < wEnd && (a.type === "Run" || a.type === "TrailRun")
    );
    const km = wActivities.reduce((s, a) => s + (a.distanceM ?? 0) / 1000, 0);
    // Get target from HM Tracker stats for current week; otherwise estimate from pattern
    const isCurrentWeek = w === 0;
    const targetKm = isCurrentWeek ? weekHMStats.targetKm : Math.round(km > 0 ? km * 1.05 : 0); // rough: actual was ~target for past weeks
    weekBuckets.push({
      label: w === 0 ? "This wk" : w === 1 ? "Last wk" : `${w}wk ago`,
      km: Math.round(km * 10) / 10,
      targetKm: isCurrentWeek ? weekHMStats.targetKm : Math.max(km, 1),
    });
  }

  // Synthesise enriched logs for habit streaks
  type EnrichedLog = (typeof last7Logs)[0] & { _date: string };
  const dateMap = new Map<string, EnrichedLog>();

  for (const log of last7Logs) {
    const key = localKey(log.date);
    dateMap.set(key, { ...log, _date: key });
  }
  for (let i = 0; i < 7; i++) {
    const d = subDays(today, i);
    const key = localKey(d);
    if (!dateMap.has(key)) {
      dateMap.set(key, {
        id: key, userId, date: d, _date: key,
        weightKg: null, sleepMin: null, rhrBpm: null, energyLevel: null,
        stressLevel: null, moodScore: null, anxietyLevel: null,
        didWorkout: false, didRead: false, didCode: false,
        didJournal: false, didMeditate: false, didNetwork: false, didLearn: false,
        deepWorkMin: null, distractionCount: null, tasksPlanned: null, tasksCompleted: null,
        kcal: null, proteinG: null, waterL: null, alcoholUnits: null,
        disciplineScore: null, momentumScore: null, notes: null,
        loggedAt: d,
      } as EnrichedLog);
    }
  }
  for (const tl of last7TechLogs) {
    const key = localKey(tl.date);
    const entry = dateMap.get(key);
    if (entry) {
      if ((tl.hoursCodedMin ?? 0) > 0) entry.didCode = true;
      if ((tl.aiAgentsBuilt ?? 0) + (tl.promptsEngineered ?? 0) + (tl.modelsExperimented ?? 0) > 0) entry.didLearn = true;
    }
  }
  for (const fl of last7FounderLogs) {
    const key = localKey(fl.date);
    const entry = dateMap.get(key);
    if (entry) {
      if ((fl.newPeopleMet ?? 0) + (fl.highValueConnections ?? 0) + (fl.coffeeChats ?? 0) > 0) entry.didNetwork = true;
    }
  }
  for (const sa of last7Strava) {
    const key = localKey(sa.date);
    const entry = dateMap.get(key);
    if (entry && sa.type !== "Walk") entry.didWorkout = true;
  }

  const enrichedLogs = Array.from(dateMap.values())
    .sort((a, b) => b._date.localeCompare(a._date)) as typeof last7Logs;

  // Scores that actually have data — show a non-zero hint
  const hasScoreData = disciplineScore > 0 || momentumScore > 0 || ctoScore > 0 || founderScore > 0;

  return (
    <div className="p-4 lg:p-6 max-w-6xl">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
              {greeting()}, Adwait
            </h1>
            <LiveClock />
          </div>
          <p className="text-sm mt-0.5 flex items-center gap-3" style={{ color: "var(--text-muted)" }}>
            <span>{format(new Date(), "EEEE, d MMMM yyyy")}</span>
            {weekHMStats.weekNum > 0 && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "var(--bg-soft)", color: "var(--text-dim)" }}
              >
                HM Training Wk {weekHMStats.weekNum} / 24
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CoachBriefModal />
          <ImportResponseModal />
        </div>
      </div>

      {/* ── Score strip ── */}
      <div
        className="rounded-xl p-4 mb-4"
        style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Performance scores</h2>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Based on yesterday's logs</span>
        </div>
        <div className="grid grid-cols-4 gap-4 justify-items-center">
          <ScoreRing label="Momentum"   score={momentumScore} />
          <ScoreRing label="Discipline" score={disciplineScore} />
          <ScoreRing label="Founder"    score={founderScore} />
          <ScoreRing label="CTO"        score={ctoScore} />
        </div>
        {!hasScoreData && (
          <p className="text-xs text-center mt-3" style={{ color: "var(--text-muted)" }}>
            Fill yesterday's log to see scores update
          </p>
        )}
      </div>

      {/* ── Main 3-zone layout ── */}
      <div className="home-grid gap-4">

        {/* ── Left — habits + deep work + quick log ── */}
        <div className="flex flex-col gap-4">

          <HabitStreaks logs={enrichedLogs} />

          {/* Yesterday vitals inline */}
          <YesterdayRecap log={yesterdayLog} />

          {/* Deep work */}
          <DeepWorkTimer />

          {/* Quick log */}
          <QuickLog />
        </div>

        {/* ── Centre — tasks ── */}
        <div className="flex flex-col gap-4">
          <div
            className="rounded-xl p-4"
            style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
          >
            <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>Today's Tasks</h2>
            <TaskList
              initialTasks={todayTasks as any}
              isToday={true}
              defaultSection="today"
            />
          </div>
        </div>

        {/* ── Right — fitness panel ── */}
        <div className="flex flex-col gap-4">
          <FitnessPanel
            todaySession={todayHMSession}
            recentActivities={last28Strava.slice(0, 8).map((a) => ({
              id: a.id,
              name: a.name,
              type: a.type,
              date: a.date,
              distanceM: a.distanceM,
              movingTimeSec: a.movingTimeSec,
              avgHeartRate: a.avgHeartRate,
              avgSpeedMps: a.avgSpeedMps,
              totalElevationM: a.totalElevationM,
            }))}
            weekBuckets={weekBuckets}
            currentWeekKm={weekHMStats.doneKm}
            currentWeekTargetKm={weekHMStats.targetKm}
            weekNum={weekHMStats.weekNum}
            raceCountdown={raceCountdown}
          />
        </div>

      </div>
    </div>
  );
}
