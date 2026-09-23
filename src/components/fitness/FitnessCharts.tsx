"use client";

import { useMemo, useState } from "react";
import { istDayLabel } from "@/lib/date";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Activity {
  date: string;
  type: string;
  distanceM: number | null;
  movingTimeSec: number | null;
  avgHeartRate: number | null;
  avgSpeedMps: number | null;
  totalElevationM: number | null;
}

interface WeekBucket {
  label: string;
  weekStart: string;
  kmRun: number;
  kmTotal: number;
  sessions: number;
  avgHR: number | null;
}

interface Props {
  activities: Activity[];
  weekBuckets: WeekBucket[];
  currentWeekKm: number;
  currentWeekTargetKm: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatPace(mps: number) {
  if (!mps || mps === 0) return "—";
  const mpk = 1000 / 60 / mps;
  const min = Math.floor(mpk);
  const sec = Math.round((mpk - min) * 60);
  return `${min}:${String(sec).padStart(2, "0")}`;
}
function fmt(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ── Polyline sparkline ─────────────────────────────────────────────────────
function Sparkline({ values, color, w = 100, h = 36 }: { values: number[]; color: string; w?: number; h?: number }) {
  if (values.length < 2) return <div style={{ width: w, height: h }} />;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - (v / max) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={parseFloat(pts.split(" ").pop()!.split(",")[0])}
        cy={parseFloat(pts.split(" ").pop()!.split(",")[1])}
        r="3" fill={color}
      />
    </svg>
  );
}

// ── Bar chart (weekly km) ─────────────────────────────────────────────────
function WeeklyBars({ buckets, currentKm, targetKm }: { buckets: WeekBucket[]; currentKm: number; targetKm: number }) {
  const maxKm = Math.max(...buckets.map(b => b.kmRun), targetKm, 1);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
        {buckets.map((b, i) => {
          const isLast = i === buckets.length - 1;
          const h = Math.max((b.kmRun / maxKm) * 68, b.kmRun > 0 ? 3 : 0);
          const tH = (b.kmRun > 0 ? Math.min((b.kmRun / maxKm) * 68, 68) : 0);
          return (
            <div key={b.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: isLast ? "var(--ink)" : "var(--text-4)" }}>
                {b.kmRun > 0 ? `${b.kmRun.toFixed(0)}` : ""}
              </span>
              <div style={{ width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", height: 68, position: "relative", overflow: "hidden" }}>
                {/* Target line */}
                {isLast && targetKm > 0 && (
                  <div style={{
                    position: "absolute", left: 0, right: 0,
                    borderTop: "1.5px dashed var(--line-2)",
                    bottom: `${(targetKm / maxKm) * 68}px`,
                  }} />
                )}
                <div style={{
                  width: "100%", height: `${h}px`,
                  background: isLast ? "var(--ink)" : "var(--line-2)",
                  borderRadius: "4px 4px 2px 2px",
                  transition: "height 0.6s ease-out",
                  opacity: isLast ? 1 : 0.7,
                }} />
              </div>
              <span style={{ fontSize: 9, color: "var(--text-4)" }}>{b.label}</span>
            </div>
          );
        })}
      </div>
      {/* Progress text */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-light)" }}>
        <span style={{ fontSize: 11, color: "var(--text-4)" }}>This week</span>
        <span className="num" style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
          {currentKm.toFixed(1)} / {targetKm} km
          <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-4)", marginLeft: 6 }}>
            ({targetKm > 0 ? Math.round((currentKm / targetKm) * 100) : 0}%)
          </span>
        </span>
      </div>
    </div>
  );
}

// ── Pace zone distribution ─────────────────────────────────────────────────
function PaceZones({ runs }: { runs: Activity[] }) {
  const zones = [
    { label: "Easy", range: [0, 5.5], color: "var(--line-2)" },
    { label: "Moderate", range: [5.5, 6.2], color: "var(--ink-4)" },
    { label: "Tempo", range: [6.2, 7.0], color: "var(--ink-3)" },
    { label: "Hard", range: [7.0, 8.0], color: "var(--ink-2)" },
    { label: "Max", range: [8.0, 99], color: "var(--ink)" },
  ];
  const totals = zones.map(z => {
    const count = runs.filter(r => {
      if (!r.avgSpeedMps || r.avgSpeedMps === 0) return false;
      const mpk = 1000 / 60 / r.avgSpeedMps;
      return mpk >= z.range[0] && mpk < z.range[1];
    }).length;
    return { ...z, count };
  });
  const total = totals.reduce((s, z) => s + z.count, 0);
  if (total === 0) return <p style={{ fontSize: 12, color: "var(--text-4)", padding: "8px 0" }}>No runs yet</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {totals.filter(z => z.count > 0).map(z => (
        <div key={z.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--text-3)", width: 60, flexShrink: 0 }}>{z.label}</span>
          <div style={{ flex: 1, height: 8, background: "var(--bg-subtle)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${(z.count / total) * 100}%`, height: "100%", background: z.color, borderRadius: 4 }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", width: 24, textAlign: "right" }}>{z.count}</span>
        </div>
      ))}
    </div>
  );
}

// ── HR trend dots ─────────────────────────────────────────────────────────
function HRDots({ runs }: { runs: Activity[] }) {
  const last12 = runs.filter(r => r.avgHeartRate).slice(0, 12).reverse();
  if (last12.length === 0) return <p style={{ fontSize: 12, color: "var(--text-4)" }}>No HR data yet</p>;
  const maxHR = Math.max(...last12.map(r => r.avgHeartRate!));
  const minHR = Math.min(...last12.map(r => r.avgHeartRate!));
  const avg = Math.round(last12.reduce((s, r) => s + r.avgHeartRate!, 0) / last12.length);
  const hrValues = last12.map(r => r.avgHeartRate!);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: "var(--text-4)" }}>Avg</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-1)" }}>{avg}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--text-4)" }}>Low</div>
            <div className="num" style={{ fontSize: 18, fontWeight: 600, color: "var(--ok)" }}>{minHR}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--text-4)" }}>High</div>
            <div className="num" style={{ fontSize: 18, fontWeight: 600, color: "var(--act)" }}>{maxHR}</div>
          </div>
        </div>
        <Sparkline values={hrValues} color="var(--ink-3)" w={80} h={32} />
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 40 }}>
        {last12.map((r, i) => {
          const range = maxHR - minHR || 1;
          const h = 8 + ((r.avgHeartRate! - minHR) / range) * 28;
          const isLast = i === last12.length - 1;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: 40 }}>
              <div style={{ width: "100%", height: `${h}px`, background: isLast ? "var(--ink)" : "var(--line-2)", borderRadius: "3px 3px 1px 1px" }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Activity type breakdown ───────────────────────────────────────────────
function ActivityBreakdown({ activities }: { activities: Activity[] }) {
  const counts: Record<string, { count: number; km: number; color: string }> = {};
  const TYPE_COLORS: Record<string, string> = {
    Run: "var(--ink)", TrailRun: "var(--ink)",
    WeightTraining: "var(--watch)", Ride: "var(--info)", Walk: "var(--ink-4)",
    Swim: "var(--ok)", Workout: "var(--ink-3)",
  };
  for (const a of activities) {
    const key = a.type === "TrailRun" ? "Run" : a.type;
    if (!counts[key]) counts[key] = { count: 0, km: 0, color: TYPE_COLORS[a.type] ?? "var(--text-4)" };
    counts[key].count++;
    counts[key].km += (a.distanceM ?? 0) / 1000;
  }
  const total = activities.length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {Object.entries(counts).sort((a, b) => b[1].count - a[1].count).map(([type, data]) => (
        <div key={type} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--text-3)", width: 90, flexShrink: 0 }}>{type}</span>
          <div style={{ flex: 1, height: 8, background: "var(--bg-subtle)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${(data.count / total) * 100}%`, height: "100%", background: data.color, borderRadius: 4 }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", width: 16, textAlign: "right" }}>{data.count}</span>
          {data.km > 0 && (
            <span style={{ fontSize: 10, color: "var(--text-4)", width: 42, textAlign: "right" }}>{data.km.toFixed(1)} km</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Recent runs table ─────────────────────────────────────────────────────
function RecentRunsTable({ runs }: { runs: Activity[] }) {
  const last8 = runs.slice(0, 8);
  if (last8.length === 0) return <p style={{ fontSize: 12, color: "var(--text-4)", padding: "8px 0" }}>No runs synced yet.</p>;
  return (
    <div>
      {/* header */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 56px 56px 72px 40px", gap: 4, paddingBottom: 6, borderBottom: "1px solid var(--border-light)", marginBottom: 4 }}>
        {["Date", "Dist", "Time", "Pace", "HR"].map(h => (
          <span key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-4)" }}>{h}</span>
        ))}
      </div>
      {last8.map((r, i) => {
        const d = new Date(r.date);
        const label = istDayLabel(d);
        const km = r.distanceM ? (r.distanceM / 1000).toFixed(1) : "—";
        const time = r.movingTimeSec ? fmt(r.movingTimeSec) : "—";
        const pace = r.avgSpeedMps ? formatPace(r.avgSpeedMps) : "—";
        return (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "1fr 56px 56px 72px 40px",
            gap: 4, padding: "7px 0",
            borderBottom: i < last8.length - 1 ? "1px solid var(--border-light)" : "none",
          }}>
            <span style={{ fontSize: 12, color: "var(--text-2)" }}>{label}</span>
            <span className="num" style={{ fontSize: 12, fontWeight: 600 }}>{km}</span>
            <span style={{ fontSize: 12, color: "var(--text-2)" }}>{time}</span>
            <span style={{ fontSize: 12, color: "var(--text-2)" }}>{pace} /km</span>
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>{r.avgHeartRate ?? "—"}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────
// Start of a calendar year in IST, as an instant
const yearStartIST = (y: number) => Date.UTC(y, 0, 1) - 5.5 * 3600000;

export default function FitnessCharts({ activities: allActivities, weekBuckets, currentWeekKm, currentWeekTargetKm }: Props) {
  const year = new Date(Date.now() + 5.5 * 3600000).getUTCFullYear();
  const [scope, setScope] = useState<"year" | "all">("year");
  const activities = useMemo(
    () => scope === "all" ? allActivities : allActivities.filter(a => new Date(a.date).getTime() >= yearStartIST(year)),
    [allActivities, scope, year],
  );
  const isRun = (a: { type: string }) => a.type === "Run" || a.type === "TrailRun";
  const runs = useMemo(() => activities.filter(isRun), [activities]);
  const allRunKm = useMemo(() => allActivities.filter(isRun).reduce((s, r) => s + (r.distanceM ?? 0) / 1000, 0), [allActivities]);
  const totalRunKm = useMemo(() => runs.reduce((s, r) => s + (r.distanceM ?? 0) / 1000, 0), [runs]);
  const totalRunTime = useMemo(() => runs.reduce((s, r) => s + (r.movingTimeSec ?? 0), 0), [runs]);
  const allKm = useMemo(() => activities.reduce((s, a) => s + (a.distanceM ?? 0) / 1000, 0), [activities]);
  const allTime = useMemo(() => activities.reduce((s, a) => s + (a.movingTimeSec ?? 0), 0), [activities]);
  const longest = runs.reduce((m, r) => Math.max(m, (r.distanceM ?? 0) / 1000), 0);
  const avgRunKm = runs.length > 0 ? totalRunKm / runs.length : 0;
  const avgPaceRuns = runs.filter(r => r.avgSpeedMps && r.avgSpeedMps > 0);
  const avgSpeed = avgPaceRuns.length > 0
    ? avgPaceRuns.reduce((s, r) => s + r.avgSpeedMps!, 0) / avgPaceRuns.length
    : 0;
  const elevationTotal = runs.reduce((s, r) => s + (r.totalElevationM ?? 0), 0);
  const label = scope === "year" ? String(year) : "all time";

  const card: React.CSSProperties = {
    background: "var(--surface)", borderRadius: "var(--radius)",
    border: "1px solid var(--border)", padding: 20, boxShadow: "var(--shadow)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Summary: this year by default, all time on the toggle ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="eyebrow">Summary · {label}</span>
        <span style={{ display: "flex", gap: 4 }}>
          {(["year", "all"] as const).map(k => (
            <button key={k} className={`btn sm${scope === k ? " primary" : ""}`} onClick={() => setScope(k)}>
              {k === "year" ? year : "All time"}
            </button>
          ))}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        {[
          { label: "Runs", value: `${runs.length}`, sub: `longest ${longest.toFixed(1)} km`, color: "var(--ink)" },
          { label: "Run km", value: `${totalRunKm.toFixed(1)}`, sub: scope === "year" ? `${allRunKm.toFixed(0)} km all time` : "all time", color: "var(--ink)" },
          { label: "Avg pace", value: avgSpeed > 0 ? formatPace(avgSpeed) : "—", sub: "min / km", color: "var(--text-1)" },
          { label: "Avg distance", value: `${avgRunKm.toFixed(1)} km`, sub: "per run", color: "var(--text-1)" },
          { label: "All activities", value: `${activities.length}`, sub: `${allKm.toFixed(0)} km · run, walk, ride, swim`, color: "var(--text-1)" },
          { label: "Moving time", value: `${Math.round(allTime / 3600)}h`, sub: `${Math.round(totalRunTime / 3600)}h running`, color: "var(--text-1)" },
        ].map(s => (
          <div key={s.label} className="statbox">
            <span className="eyebrow">{s.label}</span>
            <span className="stat" style={{ color: s.color }}>{s.value}</span>
            <span className="meta">{s.sub}</span>
          </div>
        ))}
      </div>

      {/* ── Weekly km bar chart ── */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
          <span className="eyebrow">Weekly mileage</span>
          <span style={{ fontSize: 11, color: "var(--text-4)" }}>last {weekBuckets.length} weeks</span>
        </div>
        <WeeklyBars buckets={weekBuckets} currentKm={currentWeekKm} targetKm={currentWeekTargetKm} />
      </div>

      {/* ── HR, pace zones, activity mix: side by side as the screen allows ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 12, alignItems: "start" }}>
        <div style={card}>
          <div className="card-h"><span className="eyebrow">Heart rate · runs</span></div>
          <HRDots runs={runs} />
        </div>
        <div style={card}>
          <div className="card-h"><span className="eyebrow">Pace zones</span></div>
          <PaceZones runs={runs} />
        </div>
        <div style={card}>
          <div className="card-h"><span className="eyebrow">Activity mix</span></div>
          <ActivityBreakdown activities={activities} />
        </div>
      </div>

      {/* ── Recent runs table ── */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span className="eyebrow">Recent runs</span>
          <span style={{ fontSize: 11, color: "var(--text-4)" }}>
            {Math.floor(totalRunTime / 3600)}h {Math.floor((totalRunTime % 3600) / 60)}m total · {Math.round(elevationTotal)}m↑
          </span>
        </div>
        <RecentRunsTable runs={runs} />
      </div>

    </div>
  );
}
