import { getTodayHMSession, getLast7HMSessions, getCurrentWeekHMStats, getRaceCountdown } from "@/lib/hmTracker";
import { isStravaConnected, formatPace, formatDistance, formatDuration } from "@/lib/strava";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";
import { format, parseISO, startOfWeek, subWeeks, subDays } from "date-fns";
import { daysAgoUTC } from "@/lib/date";
import StravaConnect from "@/components/fitness/StravaConnect";
import FitnessCharts from "@/components/fitness/FitnessCharts";

export const dynamic = "force-dynamic";

// ── Type helpers ──────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  gym_lc:       { bg: "#FEF3C7", text: "#B45309", label: "Gym LC"    },
  gym_ub:       { bg: "#FEF3C7", text: "#B45309", label: "Gym UB"    },
  gym_fb_light: { bg: "#FEF7E0", text: "#B45309", label: "Gym FB"    },
  easy:         { bg: "#D1FAE5", text: "#065F46", label: "Easy"      },
  quality:      { bg: "#A7F3D0", text: "#065F46", label: "Quality"   },
  long:         { bg: "#16A34A", text: "#FFFFFF", label: "Long"      },
  swim:         { bg: "#DBEAFE", text: "#2563EB", label: "Swim"      },
  rest:         { bg: "#F0F3F8", text: "#94A3B8", label: "Rest"      },
  race:         { bg: "#16A34A", text: "#FFFFFF", label: "Race"      },
};

function typeChip(type: string) {
  const c = TYPE_COLORS[type] ?? { bg: "#F0F3F8", text: "#94A3B8", label: type };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: c.bg, color: c.text }}>
      {c.label}
    </span>
  );
}

function StatusDot({ status }: { status: string | null }) {
  const color = status === "done" ? "#22C55E" : status === "partial" ? "#FBBF24" : status === "skipped" ? "#FB923C" : "var(--border)";
  return <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0 }} />;
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function FitnessPage() {
  const userId          = getUserId();
  const [today, last7, weekStats, daysToRace, stravaConnected] = await Promise.all([
    getTodayHMSession(),
    getLast7HMSessions(),
    getCurrentWeekHMStats(),
    getRaceCountdown(),
    isStravaConnected(),
  ]);

  // All Strava activities (all time for charts)
  const allActivities = await db.stravaActivity.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });

  // ── Weekly km buckets (last 10 weeks) ───────────────────────────────────
  const weekBuckets = Array.from({ length: 10 }, (_, i) => {
    const wStart = startOfWeek(subWeeks(new Date(), 9 - i), { weekStartsOn: 1 });
    const wEnd   = new Date(wStart); wEnd.setDate(wStart.getDate() + 7);
    const wActs  = allActivities.filter(a => {
      const d = new Date(a.date);
      return d >= wStart && d < wEnd;
    });
    const kmRun  = wActs
      .filter(a => a.type === "Run" || a.type === "TrailRun")
      .reduce((s, a) => s + (a.distanceM ?? 0) / 1000, 0);
    const kmTotal = wActs.reduce((s, a) => s + (a.distanceM ?? 0) / 1000, 0);
    const hrRuns  = wActs.filter(a => a.avgHeartRate);
    const avgHR   = hrRuns.length > 0 ? Math.round(hrRuns.reduce((s, a) => s + (a.avgHeartRate ?? 0), 0) / hrRuns.length) : null;
    const label   = i === 9 ? "This wk" : i === 8 ? "Last wk" : `${9 - i}wk ago`;
    return { label, weekStart: wStart.toISOString(), kmRun: Math.round(kmRun * 10) / 10, kmTotal: Math.round(kmTotal * 10) / 10, sessions: wActs.length, avgHR };
  });

  // Current week Strava km (this week's runs)
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const currentWeekKm = allActivities
    .filter(a => new Date(a.date) >= weekStart && (a.type === "Run" || a.type === "TrailRun"))
    .reduce((s, a) => s + (a.distanceM ?? 0) / 1000, 0);

  // Serialise for client component
  const activitiesForChart = allActivities.map(a => ({
    date: a.date.toISOString(),
    type: a.type,
    distanceM: a.distanceM,
    movingTimeSec: a.movingTimeSec,
    avgHeartRate: a.avgHeartRate,
    avgSpeedMps: a.avgSpeedMps,
    totalElevationM: a.totalElevationM,
  }));

  // ── Health data (last 7 days) ────────────────────────────────────────────
  const healthLogs = await db.dailyLog.findMany({
    where: { userId, date: { gte: daysAgoUTC(7) } },
    orderBy: { date: "desc" },
    take: 7,
  });
  const latestLog = healthLogs[0] ?? null;

  // ── Race progress ────────────────────────────────────────────────────────
  const raceDate   = new Date("2026-10-18");
  const trainStart = new Date("2026-05-04"); // Wk 1
  const totalDays  = Math.round((raceDate.getTime() - trainStart.getTime()) / 864e5);
  const doneDays   = Math.round((new Date().getTime() - trainStart.getTime()) / 864e5);
  const racePct    = Math.min(100, Math.max(0, Math.round((doneDays / totalDays) * 100)));

  const card: React.CSSProperties = {
    background: "var(--surface)", borderRadius: "var(--radius)",
    border: "1px solid var(--border)", padding: 20, boxShadow: "var(--shadow)",
  };

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--c-fitness)", margin: 0 }}>Fitness</h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}>
            Wk {weekStats.weekNum} of 24 · Vedanta Delhi Half Marathon
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <StravaConnect connected={stravaConnected} />
          {stravaConnected && (
            <a
              href="/api/strava/sync"
              style={{
                fontSize: 12, fontWeight: 600, padding: "7px 14px", borderRadius: "var(--radius-sm)",
                background: "var(--c-fitness-bg)", color: "var(--c-fitness)",
                border: "1px solid #A7E3BC", textDecoration: "none",
              }}
            >
              ↻ Sync
            </a>
          )}
        </div>
      </div>

      {/* ── 2-col layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 272px", gap: 16 }}>

        {/* ══ LEFT: analytics ══ */}
        <div>
          <FitnessCharts
            activities={activitiesForChart}
            weekBuckets={weekBuckets}
            currentWeekKm={Math.round(currentWeekKm * 10) / 10}
            currentWeekTargetKm={weekStats.targetKm}
          />
        </div>

        {/* ══ RIGHT: sidebar ══ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 24, alignSelf: "start" }}>

          {/* Race countdown */}
          <div style={{ ...card, padding: 18, background: "var(--c-fitness-bg)", border: "1px solid #A7E3BC" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--c-fitness)" }}>
                Race day
              </span>
              <span style={{ fontSize: 11, color: "var(--c-fitness)", opacity: 0.7 }}>18 Oct 2026</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: "var(--c-fitness)", lineHeight: 1 }}>{daysToRace}</span>
              <span style={{ fontSize: 13, color: "var(--c-fitness)", opacity: 0.8 }}>days to go</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--c-fitness)", marginBottom: 8, opacity: 0.8 }}>Vedanta Delhi Half Marathon</div>
            {/* Progress bar */}
            <div style={{ height: 5, background: "rgba(36,139,82,0.15)", borderRadius: 3 }}>
              <div style={{ width: `${racePct}%`, height: "100%", background: "var(--c-fitness)", borderRadius: 3, transition: "width 1s ease" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 9, color: "var(--c-fitness)", opacity: 0.6 }}>Training started</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: "var(--c-fitness)" }}>{racePct}%</span>
            </div>
          </div>

          {/* Today's session */}
          <div style={card}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-4)", margin: "0 0 12px" }}>
              Today · Wk {weekStats.weekNum}
            </p>
            {today ? (
              <div>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div>
                    <div style={{ marginBottom: 5 }}>{typeChip(today.type)}</div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)", margin: 0 }}>{today.name}</p>
                    {(today.targetKm || today.targetMin) && (
                      <p style={{ fontSize: 11, color: "var(--text-3)", margin: "4px 0 0" }}>
                        {today.targetKm && `${today.targetKm} km`}
                        {today.targetKm && today.targetMin && " · "}
                        {today.targetMin && `~${today.targetMin} min`}
                      </p>
                    )}
                  </div>
                  {today.logStatus ? (
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, flexShrink: 0,
                      background: today.logStatus === "done" ? "var(--c-fitness-bg)" : today.logStatus === "partial" ? "#FBF3E2" : "var(--bg-subtle)",
                      color: today.logStatus === "done" ? "var(--c-fitness)" : today.logStatus === "partial" ? "var(--c-today)" : "var(--text-4)",
                    }}>
                      {today.logStatus === "done" ? "✓ Done" : today.logStatus === "partial" ? "~ Partial" : "Skipped"}
                    </span>
                  ) : (
                    <a href="/log" style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: "var(--c-fitness)", color: "#fff", textDecoration: "none", flexShrink: 0 }}>
                      Log →
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "var(--text-3)" }}>Rest day — no session scheduled.</p>
            )}
          </div>

          {/* Week strip */}
          <div style={card}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-4)", margin: "0 0 12px" }}>
              This week
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {weekStats.sessions.map((s, i) => {
                const c = TYPE_COLORS[s.type] ?? { bg: "#F0F3F8", text: "#94A3B8" };
                return (
                  <div key={s.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <div style={{ width: "100%", borderRadius: 6, padding: "5px 2px", display: "flex", flexDirection: "column", alignItems: "center", background: c.bg, minHeight: 32, position: "relative", overflow: "hidden" }}>
                      {s.logStatus === "done" && <div style={{ position: "absolute", inset: 0, background: "var(--c-fitness)", opacity: 0.15 }} />}
                      <span style={{ fontSize: 8, fontWeight: 700, color: c.text, position: "relative" }}>{DAY_LABELS[i]}</span>
                      <span style={{ fontSize: 7, color: c.text, opacity: 0.75, position: "relative" }}>{s.targetKm ? `${s.targetKm}k` : "—"}</span>
                    </div>
                    <StatusDot status={s.logStatus} />
                  </div>
                );
              })}
            </div>
            {/* km progress */}
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-light)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: "var(--text-4)" }}>{weekStats.doneKm.toFixed(1)} done</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--c-fitness)" }}>{weekStats.targetKm} km target</span>
              </div>
              <div style={{ height: 5, background: "var(--bg-subtle)", borderRadius: 3 }}>
                <div style={{ width: `${weekStats.targetKm > 0 ? Math.min(100, (weekStats.doneKm / weekStats.targetKm) * 100) : 0}%`, height: "100%", background: "var(--c-fitness)", borderRadius: 3 }} />
              </div>
            </div>
          </div>

          {/* Last 7 days */}
          <div style={card}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", margin: "0 0 12px" }}>Last 7 days</h2>
            {last7.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--text-3)" }}>No sessions found.</p>
            ) : (
              <div>
                {last7.map((s) => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--border-light)" }}>
                    <StatusDot status={s.logStatus} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-1)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</p>
                      <p style={{ fontSize: 10, color: "var(--text-4)", margin: "1px 0 0" }}>
                        {format(new Date(s.date), "EEE d MMM")}
                      </p>
                    </div>
                    {typeChip(s.type)}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recovery snapshot */}
          <div style={card}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-4)", margin: "0 0 12px" }}>
              Recovery · yesterday
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* RHR */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "var(--text-3)" }}>Resting HR</span>
                {latestLog?.rhrBpm ? (
                  <span style={{ fontSize: 14, fontWeight: 700, color: latestLog.rhrBpm <= 60 ? "var(--c-fitness)" : latestLog.rhrBpm <= 70 ? "var(--text-1)" : "#F97316" }}>
                    {latestLog.rhrBpm} <span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-4)" }}>bpm</span>
                  </span>
                ) : <span style={{ fontSize: 12, color: "var(--text-4)" }}>—</span>}
              </div>
              {/* HRV */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "var(--text-3)" }}>HRV</span>
                {latestLog?.hrvMs ? (
                  <span style={{ fontSize: 14, fontWeight: 700, color: latestLog.hrvMs >= 60 ? "var(--c-fitness)" : latestLog.hrvMs >= 40 ? "var(--text-1)" : "#F97316" }}>
                    {latestLog.hrvMs} <span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-4)" }}>ms</span>
                  </span>
                ) : <span style={{ fontSize: 12, color: "var(--text-4)" }}>—</span>}
              </div>
              {/* VO2 Max */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "var(--text-3)" }}>VO₂ Max</span>
                {latestLog?.vo2MaxMlKgMin ? (
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>
                    {latestLog.vo2MaxMlKgMin} <span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-4)" }}>ml/kg/min</span>
                  </span>
                ) : <span style={{ fontSize: 12, color: "var(--text-4)" }}>—</span>}
              </div>
              {/* Weight */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "var(--text-3)" }}>Weight</span>
                {latestLog?.weightKg ? (
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>
                    {latestLog.weightKg} <span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-4)" }}>kg</span>
                  </span>
                ) : <span style={{ fontSize: 12, color: "var(--text-4)" }}>—</span>}
              </div>
              {/* Sleep */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "var(--text-3)" }}>Sleep</span>
                {latestLog?.sleepMin ? (
                  <span style={{ fontSize: 14, fontWeight: 700, color: latestLog.sleepMin >= 420 ? "var(--c-fitness)" : latestLog.sleepMin >= 360 ? "var(--text-1)" : "#F97316" }}>
                    {Math.floor(latestLog.sleepMin / 60)}h {latestLog.sleepMin % 60}m
                  </span>
                ) : <span style={{ fontSize: 12, color: "var(--text-4)" }}>—</span>}
              </div>
            </div>
            {latestLog && (
              <p style={{ fontSize: 10, color: "var(--text-4)", margin: "12px 0 0", borderTop: "1px solid var(--border-light)", paddingTop: 10 }}>
                Last sync: {format(latestLog.date, "EEE d MMM")}
              </p>
            )}
          </div>

          {/* HM Tracker link */}
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none", cursor: "pointer" }}
          >
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", margin: 0 }}>Open HM Tracker</p>
              <p style={{ fontSize: 11, color: "var(--text-3)", margin: "3px 0 0" }}>Plan · log sessions · coach brief</p>
            </div>
            <span style={{ fontSize: 16, color: "var(--c-fitness)" }}>→</span>
          </a>

        </div>
      </div>

    </div>
  );
}
