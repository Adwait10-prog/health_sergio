import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";
import { calcDisciplineScore, calcMomentumScore, calcWeeklyCTOScore, calcWeeklyFounderScore } from "@/lib/scores";
import { startOfDay, startOfWeek, subDays, format } from "date-fns";
import { todayUTC, yesterdayUTC, daysAgoUTC } from "@/lib/date";
import { getTodayHMSession, getCurrentWeekHMStats, getRaceCountdown } from "@/lib/hmTracker";
import ScoreRing from "@/components/today/ScoreRing";
import HabitStreaks from "@/components/today/HabitStreaks";
import DeepWorkTimer from "@/components/today/DeepWorkTimer";
import QuickLog from "@/components/today/QuickLog";
import YesterdayRecap from "@/components/today/YesterdayRecap";
import TaskList from "@/components/tasks/TaskList";
import CoachBriefModal from "@/components/modals/CoachBriefModal";
import ImportResponseModal from "@/components/modals/ImportResponseModal";
import LiveClock from "@/components/today/LiveClock";
import FitnessPanel from "@/components/today/FitnessPanel";

export const dynamic = "force-dynamic";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// Always convert to IST before extracting date — DB stores midnight IST as 18:30 UTC
function localKey(d: Date): string {
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return `${ist.getFullYear()}-${String(ist.getMonth() + 1).padStart(2, "0")}-${String(ist.getDate()).padStart(2, "0")}`;
}

export default async function TodayPage() {
  const userId = getUserId();
  // Use IST-aware today so localKey comparisons line up with DB dates
  const todayIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);
  const todayISTStr = todayIST.toISOString().split("T")[0];
  const [ty, tm, td] = todayISTStr.split("-").map(Number);
  const today = new Date(Date.UTC(ty, tm - 1, td)); // midnight UTC for IST-date comparisons
  const yesterday = subDays(today, 1);
  const weekStart = startOfDay(startOfWeek(today, { weekStartsOn: 1 }));
  const last7Start = subDays(today, 7);
  const last28Start = subDays(today, 28);

  // IST-aware DB dates (DB stores midnight IST as UTC)
  const todayDB    = todayUTC();
  const yesterdayDB = yesterdayUTC();
  const last7DB    = daysAgoUTC(7);
  const last28DB   = daysAgoUTC(28);
  const last35DB   = daysAgoUTC(35);

  const [
    todayLog, yesterdayLog, last7Logs, todayTasks,
    weekTechLogs, weekFounderLogs,
    last35TechLogs, last35FounderLogs,
    last7Strava, last28Strava,
    last35Reflections,
  ] = await Promise.all([
    db.dailyLog.findFirst({ where: { userId, date: todayDB } }),
    db.dailyLog.findFirst({ where: { userId, date: yesterdayDB } }),
    db.dailyLog.findMany({ where: { userId, date: { gte: last35DB } }, orderBy: { date: "desc" } }),
    db.task.findMany({ where: { userId, isToday: true, status: { not: "cancelled" } }, orderBy: [{ priority: "asc" }, { createdAt: "asc" }] }),
    db.technicalLog.findMany({ where: { userId, date: { gte: weekStart } } }),
    db.founderLog.findMany({ where: { userId, date: { gte: weekStart } } }),
    db.technicalLog.findMany({ where: { userId, date: { gte: last35DB } } }),
    db.founderLog.findMany({ where: { userId, date: { gte: last35DB } } }),
    db.stravaActivity.findMany({ where: { userId, date: { gte: last7Start } }, orderBy: { date: "desc" } }),
    db.stravaActivity.findMany({ where: { userId, date: { gte: last28Start } }, orderBy: { date: "desc" } }),
    db.reflection.findMany({ where: { userId, type: "daily", date: { gte: last35DB } } }),
  ]);

  // last7 slices for score enrichment
  const last7TechLogs    = last35TechLogs.filter(l => l.date >= last7Start);
  const last7FounderLogs = last35FounderLogs.filter(l => l.date >= last7Start);
  const last35Strava     = [...last7Strava, ...last28Strava.filter(a => !last7Strava.find(b => b.id === a.id))];

  // Enrich yesterdayLog with Strava + tech + founder data before scoring
  const yesterdayKey = localKey(yesterday);
  const enrichedYesterday = yesterdayLog ? { ...yesterdayLog } : null;
  if (enrichedYesterday) {
    if (last35Strava.some(a => localKey(a.date) === yesterdayKey && a.type !== "Walk")) enrichedYesterday.didWorkout = true;
    if (last35TechLogs.some(tl => localKey(tl.date) === yesterdayKey && (tl.hoursCodedMin ?? 0) > 0)) enrichedYesterday.didCode = true;
    if (last35TechLogs.some(tl => localKey(tl.date) === yesterdayKey && ((tl.aiAgentsBuilt ?? 0) + (tl.promptsEngineered ?? 0) + (tl.modelsExperimented ?? 0)) > 0)) enrichedYesterday.didLearn = true;
    if (last35FounderLogs.some(fl => localKey(fl.date) === yesterdayKey && ((fl.newPeopleMet ?? 0) + (fl.highValueConnections ?? 0) + (fl.coffeeChats ?? 0) + (fl.linkedinPosts ?? 0)) > 0)) enrichedYesterday.didNetwork = true;
    if (last35Reflections.some(r => localKey(r.date) === yesterdayKey && r.journalText)) enrichedYesterday.didJournal = true;
  }

  const disciplineScore = calcDisciplineScore(enrichedYesterday);
  const momentumScore   = calcMomentumScore(enrichedYesterday);
  const ctoScore        = calcWeeklyCTOScore(weekTechLogs);
  const founderScore    = calcWeeklyFounderScore(weekFounderLogs);
  const [todayHMSession, weekHMStats, raceCountdown] = await Promise.all([
    getTodayHMSession(),
    getCurrentWeekHMStats(),
    getRaceCountdown(),
  ]);

  // 4-week mileage buckets
  type WeekBucket = { label: string; km: number; targetKm: number };
  const weekBuckets: WeekBucket[] = [];
  for (let w = 3; w >= 0; w--) {
    const wStart = startOfDay(startOfWeek(subDays(today, w * 7), { weekStartsOn: 1 }));
    const wEnd   = new Date(wStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const runs   = last28Strava.filter(a => a.date >= wStart && a.date < wEnd && (a.type === "Run" || a.type === "TrailRun"));
    const km     = runs.reduce((s, a) => s + (a.distanceM ?? 0) / 1000, 0);
    weekBuckets.push({
      label: w === 0 ? "This wk" : w === 1 ? "Last wk" : `${w}wk ago`,
      km: Math.round(km * 10) / 10,
      targetKm: w === 0 ? weekHMStats.targetKm : Math.max(km, 1),
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
        disciplineScore: null, momentumScore: null, notes: null, loggedAt: d,
      } as EnrichedLog);
    }
  }
  // Workout → Strava (any non-walk activity)
  for (const sa of last35Strava) {
    const e = dateMap.get(localKey(sa.date));
    if (e && sa.type !== "Walk") e.didWorkout = true;
  }
  // Code + Learn → TechnicalLog
  for (const tl of last35TechLogs) {
    const e = dateMap.get(localKey(tl.date));
    if (e) {
      if ((tl.hoursCodedMin ?? 0) > 0) e.didCode = true;
      if ((tl.aiAgentsBuilt ?? 0) + (tl.promptsEngineered ?? 0) + (tl.modelsExperimented ?? 0) + (tl.modelsExperimented ?? 0) > 0) e.didLearn = true;
    }
  }
  // Network → FounderLog (people met, connections, linkedin posts, outreach)
  for (const fl of last35FounderLogs) {
    const e = dateMap.get(localKey(fl.date));
    if (e && (fl.newPeopleMet ?? 0) + (fl.highValueConnections ?? 0) + (fl.coffeeChats ?? 0) + (fl.linkedinPosts ?? 0) + (fl.investorOutreach ?? 0) + (fl.followUpsDone ?? 0) > 0) e.didNetwork = true;
  }
  // Journal → Reflection page daily entry with text
  for (const r of last35Reflections) {
    const e = dateMap.get(localKey(r.date));
    if (e && r.journalText) e.didJournal = true;
  }

  const enrichedLogs = Array.from(dateMap.values()).sort((a, b) => b._date.localeCompare(a._date)) as typeof last7Logs;
  const hasScoreData = disciplineScore > 0 || momentumScore > 0 || ctoScore > 0 || founderScore > 0;

  return (
    <div style={{ padding: "36px 40px 80px" }}>

      {/* ── Full-width header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-1)", margin: 0, letterSpacing: "-0.03em" }}>
              {greeting()}, Adwait
            </h1>
            <LiveClock />
          </div>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4, marginBottom: 0 }}>
            {format(new Date(), "EEEE, d MMMM yyyy")}
            {weekHMStats.weekNum > 0 && (
              <span style={{ color: "var(--c-today)", fontWeight: 600 }}>
                &nbsp;·&nbsp;HM Training Wk {weekHMStats.weekNum} / 24
              </span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <CoachBriefModal />
          <ImportResponseModal />
        </div>
      </div>

      {/* ── Top row: Performance Scores + Apple Watch vitals (same height) ── */}
      {(() => {
        const vlog = todayLog ?? yesterdayLog;
        const hasVitals = vlog && (vlog.rhrBpm || vlog.hrvMs || vlog.vo2MaxMlKgMin || vlog.weightKg);
        const rhrColor = !vlog?.rhrBpm ? "var(--text-1)" : vlog.rhrBpm <= 60 ? "var(--c-fitness)" : vlog.rhrBpm <= 70 ? "var(--text-1)" : "var(--c-warn)";
        const hrvColor = !vlog?.hrvMs ? "var(--text-1)" : vlog.hrvMs >= 60 ? "var(--c-fitness)" : vlog.hrvMs >= 40 ? "var(--text-1)" : "var(--c-warn)";
        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "stretch", marginBottom: 20 }} className="today-two-col">
            {/* Performance Scores */}
            <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: 24, boxShadow: "var(--shadow)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-1)", margin: 0 }}>Performance scores</h2>
                <span style={{ fontSize: 12, color: "var(--text-4)" }}>Based on yesterday's logs</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-around" }}>
                <ScoreRing label="Momentum"   score={momentumScore}   color="var(--c-today)" />
                <ScoreRing label="Discipline" score={disciplineScore} color="var(--c-reflection)" />
                <ScoreRing label="Founder"    score={founderScore}    color="var(--c-founder)" />
                <ScoreRing label="CTO"        score={ctoScore}        color="var(--c-technical)" />
              </div>
              {!hasScoreData && (
                <p style={{ fontSize: 12, textAlign: "center", marginTop: 16, color: "var(--text-4)" }}>
                  Fill yesterday's log to see scores update
                </p>
              )}
            </div>
            {/* Apple Watch vitals — same height as scores */}
            {hasVitals ? (
              <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: 20, boxShadow: "var(--shadow)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                  {todayLog ? "Today · Apple Watch" : "Yesterday · Apple Watch"}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, flex: 1 }}>
                  {vlog!.rhrBpm && <div style={{ background: "var(--bg-subtle)", borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ fontSize: 10, color: "var(--text-4)", marginBottom: 3 }}>❤️ RHR</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: rhrColor }}>{vlog!.rhrBpm} <span style={{ fontSize: 11, fontWeight: 400 }}>bpm</span></div>
                  </div>}
                  {vlog!.hrvMs && <div style={{ background: "var(--bg-subtle)", borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ fontSize: 10, color: "var(--text-4)", marginBottom: 3 }}>🫀 HRV</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: hrvColor }}>{vlog!.hrvMs} <span style={{ fontSize: 11, fontWeight: 400 }}>ms</span></div>
                  </div>}
                  {vlog!.vo2MaxMlKgMin && <div style={{ background: "var(--bg-subtle)", borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ fontSize: 10, color: "var(--text-4)", marginBottom: 3 }}>🫁 VO₂ Max</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "var(--c-technical)" }}>{vlog!.vo2MaxMlKgMin} <span style={{ fontSize: 11, fontWeight: 400 }}>ml/kg</span></div>
                  </div>}
                  {vlog!.weightKg && <div style={{ background: "var(--bg-subtle)", borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ fontSize: 10, color: "var(--text-4)", marginBottom: 3 }}>⚖️ Weight</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-1)" }}>{vlog!.weightKg} <span style={{ fontSize: 11, fontWeight: 400 }}>kg</span></div>
                  </div>}
                </div>
              </div>
            ) : <div />}
          </div>
        );
      })()}

      {/* ── Two-column layout (everything) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}
        className="today-two-col">

        {/* Left column — wide content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>

          <HabitStreaks logs={enrichedLogs} today={today} />
          <FitnessPanel
            todaySession={todayHMSession}
            recentActivities={last28Strava.slice(0, 8).map(a => ({
              id: a.id, name: a.name, type: a.type, date: a.date,
              distanceM: a.distanceM, movingTimeSec: a.movingTimeSec,
              avgHeartRate: a.avgHeartRate, avgSpeedMps: a.avgSpeedMps,
              totalElevationM: a.totalElevationM,
            }))}
            weekBuckets={weekBuckets}
            currentWeekKm={weekBuckets[3]?.km ?? 0}
            currentWeekTargetKm={weekHMStats.targetKm}
            weekNum={weekHMStats.weekNum}
            raceCountdown={raceCountdown}
            inlineMode
          />
        </div>

        {/* Right sidebar — scrolls with page, stacks all the info cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Race countdown */}
          <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: 18, boxShadow: "var(--shadow)" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--c-fitness)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Vedanta Delhi HM</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: "var(--text-1)", lineHeight: 1 }}>{raceCountdown}</span>
              <span style={{ fontSize: 13, color: "var(--text-3)" }}>days to race</span>
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-4)" }}>Sunday 18 Oct 2026 · Delhi</div>
            {weekHMStats.weekNum > 0 && (
              <div style={{ marginTop: 6, fontSize: 11, color: "var(--text-3)" }}>
                Week <strong>{weekHMStats.weekNum}</strong> / 24 · {weekHMStats.doneKm.toFixed(1)} km done this week
              </div>
            )}
          </div>

          {/* Today's Training */}
          {todayHMSession && (
            <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: 18, boxShadow: "var(--shadow)" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--c-fitness)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Today's Training · Wk {todayHMSession.weekNum}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--c-fitness-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>
                  {todayHMSession.type.startsWith("gym") ? "🏋️" : todayHMSession.type === "easy" ? "🏃" : todayHMSession.type === "quality" ? "⚡" : todayHMSession.type === "long" ? "🛤️" : todayHMSession.type === "swim" ? "🏊" : "🏅"}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>{todayHMSession.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-4)" }}>
                    {todayHMSession.targetMin ? `~${todayHMSession.targetMin} min` : ""}
                    {todayHMSession.targetKm ? ` · ${todayHMSession.targetKm} km` : ""}
                  </div>
                </div>
              </div>
              {!todayHMSession.logStatus && (
                <a href="/log" style={{ display: "block", textAlign: "center", padding: "7px 0", fontSize: 12, fontWeight: 600, color: "#fff", background: "var(--c-fitness)", borderRadius: "var(--radius-xs)", textDecoration: "none" }}>
                  Log it →
                </a>
              )}
              {todayHMSession.logStatus && (
                <div style={{ textAlign: "center", padding: "7px 0", fontSize: 12, fontWeight: 600, color: "var(--c-fitness)", background: "var(--c-fitness-bg)", borderRadius: "var(--radius-xs)" }}>
                  ✓ {todayHMSession.logStatus}
                </div>
              )}
            </div>
          )}

          {/* Vitals snapshot */}
          <YesterdayRecap log={todayLog ?? yesterdayLog} label={todayLog ? "Today's vitals" : "Yesterday's vitals"} />

          {/* Tasks */}
          <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: 18, boxShadow: "var(--shadow)" }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)", margin: "0 0 10px" }}>Today's Tasks</h2>
            <TaskList initialTasks={todayTasks as any} isToday={true} defaultSection="today" />
          </div>

          {/* Quick log */}
          <QuickLog />

          {/* Deep work timer */}
          <DeepWorkTimer />

          {/* Latest Strava */}
          {last7Strava[0] && (
            <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: 18, boxShadow: "var(--shadow)" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Latest Strava</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ display: "inline-block", padding: "2px 8px", fontSize: 10, fontWeight: 700, borderRadius: 20, color: "#fff", background: "var(--c-fitness)", textTransform: "uppercase" }}>{last7Strava[0].type}</span>
                <span style={{ fontSize: 11, color: "var(--text-4)" }}>{format(new Date(last7Strava[0].date), "EEE d MMM")}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", marginBottom: 8 }}>{last7Strava[0].name}</div>
              <div style={{ display: "flex", gap: 16 }}>
                {last7Strava[0].movingTimeSec && <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>
                    {Math.floor(last7Strava[0].movingTimeSec / 3600) > 0
                      ? `${Math.floor(last7Strava[0].movingTimeSec / 3600)}h ${Math.floor((last7Strava[0].movingTimeSec % 3600) / 60)}m`
                      : `${Math.floor(last7Strava[0].movingTimeSec / 60)}m`}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-4)" }}>Duration</div>
                </div>}
                {last7Strava[0].avgHeartRate && <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>{last7Strava[0].avgHeartRate} bpm</div>
                  <div style={{ fontSize: 10, color: "var(--text-4)" }}>Avg HR</div>
                </div>}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .today-two-col { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          .today-two-col > div:last-child { position: static !important; }
        }
      `}</style>
    </div>
  );
}
