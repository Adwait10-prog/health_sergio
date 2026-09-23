"use client";

import type { HMSessionWithLog } from "@/lib/hmTracker";
import { istDayLabel } from "@/lib/date";

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

// Categorical activity palette — token-derived so it stays legible in dark mode.
const STRENGTH = "color-mix(in srgb, var(--info) 55%, var(--act))";
const TYPE_COLOR: Record<string, string> = {
  Run: "var(--ok)",
  TrailRun: "var(--ok)",
  WeightTraining: STRENGTH,
  Ride: "var(--watch)",
  Swim: "var(--info)",
  Walk: "var(--ink-3)",
  Workout: "var(--act)",
};
const TYPE_BG: Record<string, string> = {
  Run: "var(--ok-soft)",
  TrailRun: "color-mix(in srgb, var(--ok) 24%, var(--surface))",
  WeightTraining: `color-mix(in srgb, ${STRENGTH} 14%, var(--surface))`,
  Ride: "var(--watch-soft)",
  Swim: "var(--info-soft)",
  Walk: "var(--surface-2)",
  Workout: "var(--act-soft)",
};

function typeColor(t: string) { return TYPE_COLOR[t] ?? "var(--ink-3)"; }
function typeBg(t: string) { return TYPE_BG[t] ?? "var(--surface-2)"; }

function typeIcon(t: string) {
  if (t === "Run" || t === "TrailRun") return "🏃";
  if (t === "WeightTraining") return "🏋️";
  if (t === "Ride") return "🚴";
  if (t === "Swim") return "🏊";
  if (t === "Walk") return "🚶";
  return "⚡";
}

function sessionTypeBg(type: string) {
  if (type === "gym_lc" || type === "gym_ub" || type === "gym_fb_light") return "var(--watch-soft)";
  if (type === "easy") return "var(--ok-soft)";
  if (type === "quality") return "color-mix(in srgb, var(--ok) 24%, var(--surface))";
  if (type === "long") return "var(--ok)";
  if (type === "swim") return "var(--info-soft)";
  if (type === "race") return "var(--ok)";
  return "var(--surface-2)";
}
function sessionTypeColor(type: string) {
  if (type === "gym_lc" || type === "gym_ub" || type === "gym_fb_light") return "var(--watch)";
  if (type === "easy" || type === "quality") return "var(--ok)";
  if (type === "long" || type === "race") return "#fff"; // on --ok, which stays dark in both themes
  if (type === "swim") return "var(--info)";
  return "var(--ink-3)";
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ background: "var(--surface-2)", height: 6 }}>
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
          background: "var(--surface)", borderRadius: "var(--r)", border: "1px solid var(--line)",
          padding: 20,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-4)", margin: 0 }}>
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
                borderRadius: "var(--r)", fontWeight: 700,
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
                fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: "var(--r-x)",
                background: todaySession.logStatus === "done" ? "var(--ok-soft)" :
                             todaySession.logStatus === "partial" ? "var(--watch-soft)" : "var(--surface-2)",
                color: todaySession.logStatus === "done" ? "var(--ok)" :
                       todaySession.logStatus === "partial" ? "var(--watch)" : "var(--ink-4)",
              }}>
                {todaySession.logStatus === "done" ? "✓ Done" :
                 todaySession.logStatus === "partial" ? "~ Partial" : "Skipped"}
              </span>
            ) : (
              <a
                href="/log"
                className="btn sm primary"
                style={{ textDecoration: "none" }}
              >
                Log it →
              </a>
            )}
          </div>
        </div>
      )}

      {/* Weekly progress + 4-week trend */}
      <div style={{
        background: "var(--surface)", borderRadius: "var(--r)", border: "1px solid var(--line)",
        padding: 24,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-1)", margin: 0 }}>This week's mileage</h3>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
            {currentWeekKm.toFixed(1)} / {currentWeekTargetKm} km
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, background: "var(--surface-2)", borderRadius: 3, marginBottom: 4 }}>
          <div style={{ width: `${weekPct}%`, height: "100%", background: "var(--ink)", borderRadius: 3, transition: "width 0.7s ease" }} />
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
                  background: isLast ? "var(--accent)" : "var(--line-2)",
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
        background: "var(--surface)", borderRadius: "var(--r)", border: "1px solid var(--line)",
        padding: 24,
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
            const dateLabel = istDayLabel(a.date);
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                <span style={{
                  fontSize: 15, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: "var(--r)", flexShrink: 0, background: typeBg(a.type),
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
