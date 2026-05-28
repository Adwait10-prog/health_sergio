"use client";

import type { HMSessionWithLog } from "@/lib/hmTracker";

// Formatting helpers (inline — avoids importing Node-only strava lib in a client component)
function formatPace(avgSpeedMps: number): string {
  if (!avgSpeedMps || avgSpeedMps === 0) return "—";
  const minPerKm = 1000 / 60 / avgSpeedMps;
  const min = Math.floor(minPerKm);
  const sec = Math.round((minPerKm - min) * 60);
  return `${min}:${String(sec).padStart(2, "0")} /km`;
}
function formatDistance(metres: number): string {
  return `${(metres / 1000).toFixed(2)} km`;
}
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

interface StravaActivity {
  id: string;
  name: string;
  type: string;
  date: Date;
  distanceM: number | null;
  movingTimeSec: number | null;
  avgHeartRate: number | null;
  avgSpeedMps: number | null;
  totalElevationM: number | null;
}

interface WeekBucket {
  label: string; // "Wk 1", "Wk 2" …
  km: number;
  targetKm: number;
}

interface Props {
  todaySession: HMSessionWithLog | null;
  recentActivities: StravaActivity[];
  weekBuckets: WeekBucket[]; // last 4 weeks, oldest → newest
  currentWeekKm: number;
  currentWeekTargetKm: number;
  weekNum: number;
  raceCountdown: number;
  inlineMode?: boolean; // when true, hides the training card (shown separately)
}

const TYPE_COLOR: Record<string, string> = {
  Run: "var(--fitness)",
  TrailRun: "var(--fitness)",
  WeightTraining: "#8B5CF6",
  Ride: "#F59E0B",
  Swim: "#2563EB",
  Walk: "var(--text-muted)",
  Workout: "#EC4899",
};
const TYPE_BG: Record<string, string> = {
  Run: "#D1FAE5",
  TrailRun: "#A7F3D0",
  WeightTraining: "#EDE9FE",
  Ride: "#FEF3C7",
  Swim: "#DBEAFE",
  Walk: "var(--bg-soft)",
  Workout: "#FCE7F3",
};

function typeColor(t: string) { return TYPE_COLOR[t] ?? "var(--text-muted)"; }
function typeBg(t: string) { return TYPE_BG[t] ?? "var(--bg-soft)"; }

function typeIcon(t: string) {
  if (t === "Run" || t === "TrailRun") return "🏃";
  if (t === "WeightTraining") return "🏋️";
  if (t === "Ride") return "🚴";
  if (t === "Swim") return "🏊";
  if (t === "Walk") return "🚶";
  return "⚡";
}

function sessionTypeBg(type: string) {
  if (type === "gym_lc" || type === "gym_ub" || type === "gym_fb_light") return "#FEF3C7";
  if (type === "easy") return "#D1FAE5";
  if (type === "quality") return "#A7F3D0";
  if (type === "long") return "var(--fitness)";
  if (type === "swim") return "#DBEAFE";
  if (type === "race") return "var(--fitness)";
  return "var(--bg-soft)";
}
function sessionTypeColor(type: string) {
  if (type === "gym_lc" || type === "gym_ub" || type === "gym_fb_light") return "#B45309";
  if (type === "easy" || type === "quality") return "#065F46";
  if (type === "long" || type === "race") return "#fff";
  if (type === "swim") return "#2563EB";
  return "var(--text-muted)";
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ background: "var(--bg-soft)", height: 6 }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

export default function FitnessPanel({
  todaySession,
  recentActivities,
  weekBuckets,
  currentWeekKm,
  currentWeekTargetKm,
  weekNum,
  raceCountdown,
  inlineMode = false,
}: Props) {
  const maxKm = Math.max(...weekBuckets.map((b) => b.targetKm), 1);
  const weekPct = currentWeekTargetKm > 0
    ? Math.min(100, Math.round((currentWeekKm / currentWeekTargetKm) * 100))
    : 0;

  const runs = recentActivities.filter((a) => a.type === "Run" || a.type === "TrailRun");
  const totalRunKm = runs.reduce((s, a) => s + (a.distanceM ?? 0) / 1000, 0);
  const avgHR = runs.filter((a) => a.avgHeartRate).length > 0
    ? Math.round(runs.filter((a) => a.avgHeartRate).reduce((s, a) => s + (a.avgHeartRate ?? 0), 0) / runs.filter((a) => a.avgHeartRate).length)
    : null;

  return (
    <div className="flex flex-col gap-3">

      {/* Today's session hero — hidden in inlineMode (shown in sidebar instead) */}
      {!inlineMode && todaySession && (
        <div style={{
          background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)",
          padding: 20, boxShadow: "var(--shadow)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--c-fitness)", margin: 0 }}>
              Today's training · Wk {weekNum}
            </p>
            <span style={{ fontSize: 11, color: "var(--text-4)" }}>
              🏁 {raceCountdown}d to race
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{
                fontSize: 18, width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 11, fontWeight: 700,
                background: sessionTypeBg(todaySession.type), color: sessionTypeColor(todaySession.type),
              }}>
                {todaySession.type.startsWith("gym") ? "🏋️" :
                  todaySession.type === "easy" ? "🏃" :
                  todaySession.type === "quality" ? "⚡" :
                  todaySession.type === "long" ? "🛤️" :
                  todaySession.type === "swim" ? "🏊" :
                  todaySession.type === "race" ? "🏅" : "💤"}
              </span>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)", margin: 0 }}>{todaySession.name}</p>
                <p style={{ fontSize: 12, color: "var(--text-3)", margin: "3px 0 0", display: "flex", alignItems: "center", gap: 8 }}>
                  {todaySession.targetKm && <span>{todaySession.targetKm} km</span>}
                  {todaySession.targetMin && <span>~{todaySession.targetMin} min</span>}
                  {!todaySession.targetKm && !todaySession.targetMin && <span>Strength session</span>}
                </p>
              </div>
            </div>
            {todaySession.logStatus ? (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 20,
                background: todaySession.logStatus === "done" ? "var(--c-fitness-bg)" :
                             todaySession.logStatus === "partial" ? "#FBF3E2" : "var(--bg-subtle)",
                color: todaySession.logStatus === "done" ? "var(--c-fitness)" :
                       todaySession.logStatus === "partial" ? "var(--c-today)" : "var(--text-4)",
              }}>
                {todaySession.logStatus === "done" ? "✓ Done" :
                 todaySession.logStatus === "partial" ? "~ Partial" : "Skipped"}
              </span>
            ) : (
              <a
                href="/log"
                style={{
                  fontSize: 11, fontWeight: 700, padding: "5px 14px", borderRadius: 20,
                  background: "var(--c-fitness)", color: "#fff", textDecoration: "none",
                }}
              >
                Log it →
              </a>
            )}
          </div>
        </div>
      )}

      {/* Weekly progress + 4-week trend */}
      <div style={{
        background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)",
        padding: 24, boxShadow: "var(--shadow)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-1)", margin: 0 }}>This week's mileage</h3>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--c-fitness)" }}>
            {currentWeekKm.toFixed(1)} / {currentWeekTargetKm} km
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, background: "var(--bg-subtle)", borderRadius: 3, marginBottom: 4 }}>
          <div style={{ width: `${weekPct}%`, height: "100%", background: "var(--c-fitness)", borderRadius: 3, transition: "width 0.7s ease" }} />
        </div>
        <p style={{ fontSize: 11, color: "var(--text-4)", textAlign: "right", marginBottom: 16 }}>{weekPct}% of target</p>

        {/* 4-week bar chart */}
        <p style={{ fontSize: 11, fontWeight: 500, color: "var(--text-4)", marginBottom: 8 }}>Last 4 weeks</p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 72 }}>
          {weekBuckets.map((b, i) => {
            const barPct = maxKm > 0 ? (b.km / maxKm) * 100 : 0;
            const isLast = i === weekBuckets.length - 1;
            return (
              <div key={b.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-4)" }}>{b.km > 0 ? b.km : ""}</span>
                <div style={{
                  width: "100%", height: `${Math.max((b.km / maxKm) * 44, b.km > 0 ? 3 : 0)}px`,
                  background: isLast ? "var(--c-fitness)" : "var(--border-light)",
                  borderRadius: 4, transition: "height 0.6s ease-out",
                }} />
                <span style={{ fontSize: 10, color: "var(--text-4)" }}>{b.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent activities */}
      <div style={{
        background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)",
        padding: 24, boxShadow: "var(--shadow)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-1)", margin: 0 }}>Recent activities</h3>
          {totalRunKm > 0 && (
            <span style={{ fontSize: 12, color: "var(--text-4)" }}>
              {totalRunKm.toFixed(1)} km run
              {avgHR ? ` · ${avgHR} bpm avg` : ""}
            </span>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {recentActivities.slice(0, 6).map((a) => {
            const pace = a.avgSpeedMps && a.avgSpeedMps > 0 ? formatPace(a.avgSpeedMps) : null;
            const dist = a.distanceM && a.distanceM > 100 ? formatDistance(a.distanceM) : null;
            const dur = a.movingTimeSec ? formatDuration(a.movingTimeSec) : null;
            const dateLabel = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(new Date(a.date));
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border-light)" }}>
                <span style={{
                  fontSize: 15, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: 10, flexShrink: 0, background: typeBg(a.type),
                }}>
                  {typeIcon(a.type)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</p>
                  <p style={{ fontSize: 11, color: "var(--text-4)", margin: "2px 0 0", display: "flex", alignItems: "center", gap: 6 }}>
                    <span>{dateLabel}</span>
                    {dist && <><span style={{ opacity: 0.4 }}>·</span><span>{dist}</span></>}
                    {dur && <><span style={{ opacity: 0.4 }}>·</span><span>{dur}</span></>}
                    {pace && (a.type === "Run" || a.type === "TrailRun") && <><span style={{ opacity: 0.4 }}>·</span><span>{pace}</span></>}
                  </p>
                </div>
                {a.avgHeartRate && (
                  <span style={{ fontSize: 11, fontWeight: 600, flexShrink: 0, color: "var(--text-3)" }}>
                    ❤️ {a.avgHeartRate}
                  </span>
                )}
              </div>
            );
          })}
          {recentActivities.length === 0 && (
            <p style={{ fontSize: 13, textAlign: "center", padding: "16px 0", color: "var(--text-4)" }}>
              No activities synced yet
            </p>
          )}
        </div>
      </div>

    </div>
  );
}
