import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";
import { getTodayHMSession, getRaceCountdown, getCurrentWeekHMStats } from "@/lib/hmTracker";
import { daysAgoUTC, yesterdayUTC } from "@/lib/date";
import { format } from "date-fns";
import TaskList from "@/components/tasks/TaskList";

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  gym_lc:       { bg: "#FEF3C7", text: "#B45309" },
  gym_ub:       { bg: "#FEF3C7", text: "#B45309" },
  gym_fb_light: { bg: "#FEF7E0", text: "#B45309" },
  easy:         { bg: "#D1FAE5", text: "#065F46" },
  quality:      { bg: "#A7F3D0", text: "#065F46" },
  long:         { bg: "#16A34A", text: "#FFFFFF" },
  swim:         { bg: "#DBEAFE", text: "#2563EB" },
  rest:         { bg: "#F0F3F8", text: "#94A3B8" },
  race:         { bg: "#16A34A", text: "#FFFFFF" },
};

interface Props {
  section: string;
  accentColor: string;
}

export default async function PageSidebar({ section, accentColor }: Props) {
  const userId = getUserId();

  const [latestLog, tasks] = await Promise.all([
    db.dailyLog.findFirst({
      where: { userId, date: { gte: daysAgoUTC(2) } },
      orderBy: { date: "desc" },
    }),
    db.task.findMany({
      where: { userId, section, status: { not: "cancelled" } },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const todaySession = getTodayHMSession();
  const daysToRace   = getRaceCountdown();
  const weekStats    = getCurrentWeekHMStats();

  const card: React.CSSProperties = {
    background: "var(--surface)",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    padding: 16,
    boxShadow: "var(--shadow)",
  };

  const tc = todaySession ? (TYPE_COLORS[todaySession.type] ?? { bg: "#F0F3F8", text: "#94A3B8" }) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 24, alignSelf: "start" }}>

      {/* Recovery snapshot */}
      <div style={card}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-4)", margin: "0 0 12px" }}>
          Recovery · today
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {/* RHR */}
          <div style={{ background: "var(--bg-subtle)", borderRadius: 8, padding: "10px 12px" }}>
            <p style={{ fontSize: 10, color: "var(--text-4)", margin: "0 0 4px", fontWeight: 600 }}>RESTING HR</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: latestLog?.rhrBpm ? (latestLog.rhrBpm <= 60 ? "var(--c-fitness)" : latestLog.rhrBpm <= 70 ? "var(--text-1)" : "#F97316") : "var(--text-4)", margin: 0 }}>
              {latestLog?.rhrBpm ?? "—"}
              {latestLog?.rhrBpm && <span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-4)" }}> bpm</span>}
            </p>
          </div>
          {/* HRV */}
          <div style={{ background: "var(--bg-subtle)", borderRadius: 8, padding: "10px 12px" }}>
            <p style={{ fontSize: 10, color: "var(--text-4)", margin: "0 0 4px", fontWeight: 600 }}>HRV</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: latestLog?.hrvMs ? (latestLog.hrvMs >= 60 ? "var(--c-fitness)" : latestLog.hrvMs >= 40 ? "var(--text-1)" : "#F97316") : "var(--text-4)", margin: 0 }}>
              {latestLog?.hrvMs ?? "—"}
              {latestLog?.hrvMs && <span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-4)" }}> ms</span>}
            </p>
          </div>
          {/* VO2 */}
          <div style={{ background: "var(--bg-subtle)", borderRadius: 8, padding: "10px 12px" }}>
            <p style={{ fontSize: 10, color: "var(--text-4)", margin: "0 0 4px", fontWeight: 600 }}>VO₂ MAX</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: "var(--text-1)", margin: 0 }}>
              {latestLog?.vo2MaxMlKgMin ?? "—"}
              {latestLog?.vo2MaxMlKgMin && <span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-4)" }}> ml/kg</span>}
            </p>
          </div>
          {/* Weight */}
          <div style={{ background: "var(--bg-subtle)", borderRadius: 8, padding: "10px 12px" }}>
            <p style={{ fontSize: 10, color: "var(--text-4)", margin: "0 0 4px", fontWeight: 600 }}>WEIGHT</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: "var(--text-1)", margin: 0 }}>
              {latestLog?.weightKg ?? "—"}
              {latestLog?.weightKg && <span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-4)" }}> kg</span>}
            </p>
          </div>
        </div>
        {latestLog && (
          <p style={{ fontSize: 10, color: "var(--text-4)", margin: "10px 0 0", paddingTop: 10, borderTop: "1px solid var(--border-light)" }}>
            Synced {format(latestLog.date, "EEE d MMM")} via Apple Watch
          </p>
        )}
      </div>

      {/* Today's training */}
      {todaySession && tc && (
        <div style={card}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-4)", margin: "0 0 10px" }}>
            Training · Wk {weekStats.weekNum}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: tc.bg, color: tc.text }}>
              {todaySession.type.replace(/_/g, " ").toUpperCase()}
            </span>
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", margin: "0 0 6px" }}>{todaySession.name}</p>
          <p style={{ fontSize: 11, color: "var(--text-4)", margin: "0 0 12px" }}>
            {todaySession.targetKm && `${todaySession.targetKm} km`}
            {todaySession.targetKm && todaySession.targetMin && " · "}
            {todaySession.targetMin && `~${todaySession.targetMin} min`}
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: "var(--text-4)" }}>🏁 {daysToRace}d to race</span>
            {!todaySession.logStatus && (
              <a href="/fitness" style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 20, background: "var(--c-fitness)", color: "#fff", textDecoration: "none" }}>
                Log →
              </a>
            )}
            {todaySession.logStatus === "done" && (
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--c-fitness)" }}>✓ Done</span>
            )}
          </div>
        </div>
      )}

      {/* Tasks */}
      <div style={card}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", margin: "0 0 12px" }}>
          {section.charAt(0).toUpperCase() + section.slice(1)} Tasks
        </h2>
        <TaskList
          initialTasks={tasks as any}
          section={section}
          defaultSection={section}
        />
      </div>

    </div>
  );
}
