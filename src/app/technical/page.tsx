import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";
import { startOfDay, subDays, startOfWeek } from "date-fns";
import { calcWeeklyCTOScore } from "@/lib/scores";
import ScoreRing from "@/components/today/ScoreRing";
import TechLogForm from "@/components/technical/TechLogForm";
import Sparkline from "@/components/ui/Sparkline";
import TaskList from "@/components/tasks/TaskList";

export const dynamic = "force-dynamic";

export default async function TechnicalPage() {
  const userId = getUserId();
  const today = startOfDay(new Date());
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  const [todayLog, weekLogs, last30Logs, tasks] = await Promise.all([
    db.technicalLog.findFirst({ where: { userId, date: today } }),
    db.technicalLog.findMany({
      where: { userId, date: { gte: weekStart } },
    }),
    db.technicalLog.findMany({
      where: { userId, date: { gte: subDays(today, 30) } },
      orderBy: { date: "asc" },
    }),
    db.task.findMany({
      where: { userId, section: "technical", status: { not: "cancelled" } },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const ctoScore = calcWeeklyCTOScore(weekLogs);

  // Weekly totals for counter cards
  const weekHours  = Math.round(weekLogs.reduce((s, l) => s + (l.hoursCodedMin ?? 0), 0) / 60 * 10) / 10;
  const weekFeats  = weekLogs.reduce((s, l) => s + (l.featuresShipped ?? 0), 0);
  const weekAI     = weekLogs.reduce((s, l) => s + (l.aiAgentsBuilt ?? 0) + (l.promptsEngineered ?? 0), 0);
  const weekPRs    = weekLogs.reduce((s, l) => s + (l.prsMerged ?? 0), 0);

  // 30-day sparkline data
  const hoursSparkline    = last30Logs.map((l) => (l.hoursCodedMin ?? 0) / 60);
  const featuresSparkline = last30Logs.map((l) => l.featuresShipped ?? 0);

  const counters = [
    { label: "Hours coded",      value: weekHours,  unit: "h",  color: "var(--technical)" },
    { label: "Features shipped", value: weekFeats,  unit: "",   color: "var(--accent)" },
    { label: "AI experiments",   value: weekAI,     unit: "",   color: "var(--founder)" },
    { label: "PRs merged",       value: weekPRs,    unit: "",   color: "var(--finance)" },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--technical)" }}>Technical</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>This week's output</p>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_300px] gap-4">
        {/* Left column */}
        <div className="flex flex-col gap-4">

          {/* CTO score + counters */}
          <div
            className="rounded-xl p-4"
            style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-start gap-6">
              <div className="flex flex-col items-center gap-1">
                <ScoreRing label="CTO Score" score={ctoScore} size={96} />
                <p className="text-[10px] text-center" style={{ color: "var(--text-muted)" }}>this week</p>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-3">
                {counters.map(({ label, value, unit, color }) => (
                  <div
                    key={label}
                    className="rounded-lg p-3"
                    style={{ background: "var(--bg-soft)" }}
                  >
                    <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
                    <p className="text-xl font-bold" style={{ color }}>
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
            className="rounded-xl p-4"
            style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
          >
            <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>30-day trends</h2>
            {last30Logs.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>No data yet — start logging daily.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {[
                  { label: "Hours coded / day", data: hoursSparkline,    color: "var(--technical)" },
                  { label: "Features shipped",  data: featuresSparkline, color: "var(--accent)"    },
                ].map(({ label, data, color }) => (
                  <div key={label} className="flex items-center gap-4">
                    <span className="text-xs w-36 shrink-0" style={{ color: "var(--text-dim)" }}>{label}</span>
                    <Sparkline values={data} color={color} width={200} height={36} />
                    <span className="text-sm font-semibold ml-auto" style={{ color }}>
                      {data[data.length - 1]?.toFixed(1) ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column — tasks */}
        <div
          className="rounded-xl p-4 h-fit lg:sticky lg:top-6"
          style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>Technical Tasks</h2>
          <TaskList
            initialTasks={tasks as any}
            section="technical"
            defaultSection="technical"
          />
        </div>
      </div>
    </div>
  );
}
