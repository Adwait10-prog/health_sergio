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

      {/* Today's session hero */}
      {todaySession && (
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--fitness)" }}>
              Today's training · Wk {weekNum}
            </p>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              🏁 {raceCountdown}d to race
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className="text-lg w-10 h-10 flex items-center justify-center rounded-lg font-bold"
                style={{ background: sessionTypeBg(todaySession.type), color: sessionTypeColor(todaySession.type) }}
              >
                {todaySession.type.startsWith("gym") ? "🏋️" :
                  todaySession.type === "easy" ? "🏃" :
                  todaySession.type === "quality" ? "⚡" :
                  todaySession.type === "long" ? "🛤️" :
                  todaySession.type === "swim" ? "🏊" :
                  todaySession.type === "race" ? "🏅" : "💤"}
              </span>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{todaySession.name}</p>
                <p className="text-xs mt-0.5 flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                  {todaySession.targetKm && <span>{todaySession.targetKm} km</span>}
                  {todaySession.targetMin && <span>~{todaySession.targetMin} min</span>}
                  {!todaySession.targetKm && !todaySession.targetMin && <span>Strength session</span>}
                </p>
              </div>
            </div>
            {todaySession.logStatus ? (
              <span
                className="text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{
                  background: todaySession.logStatus === "done" ? "var(--accent-soft)" :
                               todaySession.logStatus === "partial" ? "#FEF3C7" : "var(--bg-soft)",
                  color: todaySession.logStatus === "done" ? "var(--accent-strong)" :
                         todaySession.logStatus === "partial" ? "#B45309" : "var(--text-muted)",
                }}
              >
                {todaySession.logStatus === "done" ? "✓ Done" :
                 todaySession.logStatus === "partial" ? "~ Partial" : "Skipped"}
              </span>
            ) : (
              <a
                href="http://localhost:3000/log"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: "var(--fitness)", color: "#fff", textDecoration: "none" }}
              >
                Log it →
              </a>
            )}
          </div>
        </div>
      )}

      {/* Weekly progress + 4-week trend */}
      <div
        className="rounded-xl p-4"
        style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>This week's mileage</h3>
          <span className="text-xs font-semibold" style={{ color: weekPct >= 100 ? "var(--accent-strong)" : "var(--fitness)" }}>
            {currentWeekKm.toFixed(1)} / {currentWeekTargetKm} km
          </span>
        </div>

        {/* Big progress bar */}
        <div className="mb-4">
          <div className="w-full rounded-full overflow-hidden" style={{ background: "var(--bg-soft)", height: 10 }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${weekPct}%`,
                background: weekPct >= 100
                  ? "var(--accent)"
                  : `linear-gradient(90deg, var(--fitness), var(--accent))`,
              }}
            />
          </div>
          <p className="text-xs mt-1 text-right" style={{ color: "var(--text-muted)" }}>{weekPct}% of target</p>
        </div>

        {/* 4-week bar chart */}
        <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Last 4 weeks</p>
        <div className="flex items-end gap-2" style={{ height: 56 }}>
          {weekBuckets.map((b, i) => {
            const barPct = maxKm > 0 ? (b.km / maxKm) * 100 : 0;
            const targetPct = maxKm > 0 ? (b.targetKm / maxKm) * 100 : 0;
            const isLast = i === weekBuckets.length - 1;
            return (
              <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs" style={{ color: "var(--text-muted)", fontSize: 9 }}>{b.km.toFixed(0)}</span>
                <div className="relative w-full flex items-end" style={{ height: 40 }}>
                  {/* target ghost bar */}
                  <div
                    className="absolute bottom-0 w-full rounded-t"
                    style={{ height: `${targetPct}%`, background: "var(--bg-soft)", opacity: 0.8 }}
                  />
                  {/* actual bar */}
                  <div
                    className="absolute bottom-0 w-full rounded-t transition-all duration-500"
                    style={{
                      height: `${barPct}%`,
                      background: isLast
                        ? `linear-gradient(180deg, var(--fitness), var(--accent))`
                        : b.km >= b.targetKm ? "var(--accent)" : "var(--fitness)",
                      opacity: isLast ? 1 : 0.7,
                    }}
                  />
                </div>
                <span className="text-xs font-medium" style={{ color: isLast ? "var(--text)" : "var(--text-muted)", fontSize: 10 }}>
                  {b.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent activities */}
      <div
        className="rounded-xl p-4"
        style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Recent activities</h3>
          {totalRunKm > 0 && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {totalRunKm.toFixed(1)} km run
              {avgHR ? ` · ${avgHR} bpm avg` : ""}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {recentActivities.slice(0, 6).map((a) => {
            const pace = a.avgSpeedMps && a.avgSpeedMps > 0 ? formatPace(a.avgSpeedMps) : null;
            const dist = a.distanceM && a.distanceM > 100 ? formatDistance(a.distanceM) : null;
            const dur = a.movingTimeSec ? formatDuration(a.movingTimeSec) : null;
            const dateLabel = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(new Date(a.date));
            return (
              <div key={a.id} className="flex items-center gap-3 py-1.5">
                <span
                  className="text-sm w-8 h-8 flex items-center justify-center rounded-lg shrink-0"
                  style={{ background: typeBg(a.type), color: typeColor(a.type) }}
                >
                  {typeIcon(a.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{a.name}</p>
                  <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                    <span>{dateLabel}</span>
                    {dist && <><span>·</span><span>{dist}</span></>}
                    {dur && <><span>·</span><span>{dur}</span></>}
                    {pace && (a.type === "Run" || a.type === "TrailRun") && <><span>·</span><span>{pace}</span></>}
                  </p>
                </div>
                {a.avgHeartRate && (
                  <span className="text-xs font-medium shrink-0" style={{ color: "var(--text-muted)" }}>
                    ❤️ {a.avgHeartRate}
                  </span>
                )}
              </div>
            );
          })}
          {recentActivities.length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
              No activities synced yet
            </p>
          )}
        </div>
      </div>

    </div>
  );
}
