"use client";

import { useMemo } from "react";

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
              <span style={{ fontSize: 9, fontWeight: 700, color: isLast ? "var(--c-fitness)" : "var(--text-4)" }}>
                {b.kmRun > 0 ? `${b.kmRun.toFixed(0)}` : ""}
              </span>
              <div style={{ width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", height: 68, position: "relative", overflow: "hidden" }}>
                {/* Target line */}
                {isLast && targetKm > 0 && (
                  <div style={{
                    position: "absolute", left: 0, right: 0,
                    borderTop: "1.5px dashed var(--c-fitness)", opacity: 0.4,
                    bottom: `${(targetKm / maxKm) * 68}px`,
                  }} />
                )}
                <div style={{
                  width: "100%", height: `${h}px`,
                  background: isLast ? "var(--c-fitness)" : "var(--border)",
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
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--c-fitness)" }}>
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
    { label: "Easy", range: [0, 5.5], color: "#86EFAC" },
    { label: "Moderate", range: [5.5, 6.2], color: "#4ADE80" },
    { label: "Tempo", range: [6.2, 7.0], color: "var(--c-fitness)" },
    { label: "Hard", range: [7.0, 8.0], color: "#15803D" },
    { label: "Max", range: [8.0, 99], color: "#052e16" },
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
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--c-fitness)" }}>{minHR}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--text-4)" }}>High</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#C06030" }}>{maxHR}</div>
          </div>
        </div>
        <Sparkline values={hrValues} color="var(--c-fitness)" w={80} h={32} />
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 40 }}>
        {last12.map((r, i) => {
          const range = maxHR - minHR || 1;
          const h = 8 + ((r.avgHeartRate! - minHR) / range) * 28;
          const isLast = i === last12.length - 1;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: 40 }}>
              <div style={{ width: "100%", height: `${h}px`, background: isLast ? "var(--c-fitness)" : "var(--border)", borderRadius: "3px 3px 1px 1px" }} />
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
    Run: "var(--c-fitness)", TrailRun: "var(--c-fitness)",
    WeightTraining: "#C06030", Ride: "#C08B2F", Walk: "var(--text-4)",
    Swim: "#1E8585", Workout: "#5563C0",
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
        const label = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(d);
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
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--c-fitness)" }}>{km}</span>
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
export default function FitnessCharts({ activities, weekBuckets, currentWeekKm, currentWeekTargetKm }: Props) {
  const runs = useMemo(() => activities.filter(a => a.type === "Run" || a.type === "TrailRun"), [activities]);
  const totalRunKm = useMemo(() => runs.reduce((s, r) => s + (r.distanceM ?? 0) / 1000, 0), [runs]);
  const totalRunTime = useMemo(() => runs.reduce((s, r) => s + (r.movingTimeSec ?? 0), 0), [runs]);
  const avgRunKm = runs.length > 0 ? totalRunKm / runs.length : 0;
  const avgPaceRuns = runs.filter(r => r.avgSpeedMps && r.avgSpeedMps > 0);
  const avgSpeed = avgPaceRuns.length > 0
    ? avgPaceRuns.reduce((s, r) => s + r.avgSpeedMps!, 0) / avgPaceRuns.length
    : 0;
  const elevationTotal = runs.reduce((s, r) => s + (r.totalElevationM ?? 0), 0);

  const card: React.CSSProperties = {
    background: "var(--surface)", borderRadius: "var(--radius)",
    border: "1px solid var(--border)", padding: 20, boxShadow: "var(--shadow)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Run summary stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {[
          { label: "Total runs", value: `${runs.length}`, sub: "synced from Strava", color: "var(--c-fitness)" },
          { label: "Total km", value: `${totalRunKm.toFixed(1)}`, sub: "all time", color: "var(--c-fitness)" },
          { label: "Avg pace", value: avgSpeed > 0 ? formatPace(avgSpeed) : "—", sub: "min / km", color: "var(--text-1)" },
          { label: "Avg distance", value: `${avgRunKm.toFixed(1)} km`, sub: "per run", color: "var(--text-1)" },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-4)", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "var(--text-4)", marginTop: 3 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Weekly km bar chart ── */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", margin: 0 }}>Weekly mileage</h3>
          <span style={{ fontSize: 11, color: "var(--text-4)" }}>last {weekBuckets.length} weeks</span>
        </div>
        <WeeklyBars buckets={weekBuckets} currentKm={currentWeekKm} targetKm={currentWeekTargetKm} />
      </div>

      {/* ── HR + Pace zones side by side ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", margin: "0 0 14px" }}>Heart rate (runs)</h3>
          <HRDots runs={runs} />
        </div>
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", margin: "0 0 14px" }}>Pace zones</h3>
          <PaceZones runs={runs} />
        </div>
      </div>

      {/* ── Activity breakdown ── */}
      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", margin: "0 0 14px" }}>Activity mix</h3>
        <ActivityBreakdown activities={activities} />
      </div>

      {/* ── Recent runs table ── */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", margin: 0 }}>Recent runs</h3>
          <span style={{ fontSize: 11, color: "var(--text-4)" }}>
            {Math.floor(totalRunTime / 3600)}h {Math.floor((totalRunTime % 3600) / 60)}m total · {Math.round(elevationTotal)}m↑
          </span>
        </div>
        <RecentRunsTable runs={runs} />
      </div>

    </div>
  );
}
