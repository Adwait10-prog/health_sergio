import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";
import { startOfDay, subDays, startOfWeek } from "date-fns";
import { calcWeeklyCTOScore } from "@/lib/scores";
import ScoreRing from "@/components/today/ScoreRing";
import TechLogForm from "@/components/technical/TechLogForm";
import Sparkline from "@/components/ui/Sparkline";
import PageSidebar from "@/components/layout/PageSidebar";

export const dynamic = "force-dynamic";

export default async function TechnicalPage() {
  const userId = getUserId();
  const today = startOfDay(new Date());
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  const [todayLog, weekLogs, last30Logs] = await Promise.all([
    db.technicalLog.findFirst({ where: { userId, date: today } }),
    db.technicalLog.findMany({
      where: { userId, date: { gte: weekStart } },
    }),
    db.technicalLog.findMany({
      where: { userId, date: { gte: subDays(today, 30) } },
      orderBy: { date: "asc" },
    }),
  ]);

  const ctoScore = calcWeeklyCTOScore(weekLogs);

  const weekHours  = Math.round(weekLogs.reduce((s, l) => s + (l.hoursCodedMin ?? 0), 0) / 60 * 10) / 10;
  const weekFeats  = weekLogs.reduce((s, l) => s + (l.featuresShipped ?? 0), 0);
  const weekAI     = weekLogs.reduce((s, l) => s + (l.aiAgentsBuilt ?? 0) + (l.promptsEngineered ?? 0), 0);
  const weekPRs    = weekLogs.reduce((s, l) => s + (l.prsMerged ?? 0), 0);

  const hoursSparkline    = last30Logs.map((l) => (l.hoursCodedMin ?? 0) / 60);
  const featuresSparkline = last30Logs.map((l) => l.featuresShipped ?? 0);

  const counters = [
    { label: "Hours coded",      value: weekHours,  unit: "h",  color: "var(--technical)" },
    { label: "Features shipped", value: weekFeats,  unit: "",   color: "var(--accent)" },
    { label: "AI experiments",   value: weekAI,     unit: "",   color: "var(--founder)" },
    { label: "PRs merged",       value: weekPRs,    unit: "",   color: "var(--finance)" },
  ];

  return (
    <div style={{ padding: "24px 20px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--technical)", margin: 0 }}>Technical</h1>
        <p style={{ fontSize: 13, marginTop: 2, color: "var(--text-muted)", margin: "2px 0 0" }}>This week's output</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* CTO score + counters */}
          <div
            style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <ScoreRing label="CTO Score" score={ctoScore} size={96} />
                <p style={{ fontSize: 10, textAlign: "center", color: "var(--text-muted)", margin: 0 }}>this week</p>
              </div>
              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {counters.map(({ label, value, unit, color }) => (
                  <div
                    key={label}
                    style={{ background: "var(--bg-soft)", borderRadius: 8, padding: 12 }}
                  >
                    <p style={{ fontSize: 12, marginBottom: 2, color: "var(--text-muted)", margin: "0 0 2px" }}>{label}</p>
                    <p style={{ fontSize: 20, fontWeight: 700, color, margin: 0 }}>
                      {value}{unit}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Today's log form */}
          <TechLogForm existing={(todayLog ?? {}) as Record<string, unknown>} />

          {/* 30-day sparklines */}
          <div
            style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}
          >
            <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: "var(--text)", margin: "0 0 16px" }}>30-day trends</h2>
            {last30Logs.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>No data yet — start logging daily.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  { label: "Hours coded / day", data: hoursSparkline,    color: "var(--technical)" },
                  { label: "Features shipped",  data: featuresSparkline, color: "var(--accent)"    },
                ].map(({ label, data, color }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: 12, width: 144, flexShrink: 0, color: "var(--text-dim)" }}>{label}</span>
                    <Sparkline values={data} color={color} width={200} height={36} />
                    <span style={{ fontSize: 13, fontWeight: 600, marginLeft: "auto", color }}>
                      {data[data.length - 1]?.toFixed(1) ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column — sidebar */}
        <PageSidebar section="technical" accentColor="var(--c-technical)" />
      </div>
    </div>
  );
}
