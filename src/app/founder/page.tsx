import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";
import { startOfDay, subDays, startOfWeek } from "date-fns";
import { calcWeeklyFounderScore } from "@/lib/scores";
import ScoreRing from "@/components/today/ScoreRing";
import FounderLogForm from "@/components/founder/FounderLogForm";
import Sparkline from "@/components/ui/Sparkline";
import TaskList from "@/components/tasks/TaskList";

export const dynamic = "force-dynamic";

export default async function FounderPage() {
  const userId = getUserId();
  const today     = startOfDay(new Date());
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  const [todayLog, weekLogs, last30Logs, tasks] = await Promise.all([
    db.founderLog.findFirst({ where: { userId, date: today } }),
    db.founderLog.findMany({ where: { userId, date: { gte: weekStart } } }),
    db.founderLog.findMany({
      where: { userId, date: { gte: subDays(today, 30) } },
      orderBy: { date: "asc" },
    }),
    db.task.findMany({
      where: { userId, section: "founder", status: { not: "cancelled" } },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const founderScore = calcWeeklyFounderScore(weekLogs);

  const weekConnections = weekLogs.reduce((s, l) => s + (l.newPeopleMet ?? 0) + (l.highValueConnections ?? 0), 0);
  const weekStartup     = weekLogs.reduce((s, l) => s + (l.ideasResearched ?? 0) + (l.validationCalls ?? 0) + (l.pitchesPrepared ?? 0), 0);
  const weekPosts       = weekLogs.reduce((s, l) => s + (l.linkedinPosts ?? 0), 0);
  const weekOutreach    = weekLogs.reduce((s, l) => s + (l.investorOutreach ?? 0) + (l.followUpsDone ?? 0), 0);

  // Latest LinkedIn followers for display
  const latestFollowers = [...last30Logs].reverse().find((l) => l.linkedinFollowers != null)?.linkedinFollowers ?? 0;
  const linkedinSparkline = last30Logs.map((l) => l.linkedinFollowers ?? 0).filter((v, i, a) => {
    // forward-fill zeros with last known value
    if (v !== 0) return true;
    const prev = a.slice(0, i).reverse().find((x) => x !== 0);
    return prev != null;
  });
  // simple forward fill
  const filledSparkline: number[] = [];
  let last = 0;
  for (const v of last30Logs.map((l) => l.linkedinFollowers ?? 0)) {
    if (v !== 0) last = v;
    filledSparkline.push(last);
  }

  const counters = [
    { label: "New connections", value: weekConnections, color: "var(--founder)"   },
    { label: "Startup actions", value: weekStartup,     color: "var(--technical)" },
    { label: "Posts published", value: weekPosts,       color: "var(--finance)"   },
    { label: "Outreach done",   value: weekOutreach,    color: "var(--accent)"    },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--founder)" }}>Founder</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>This week's networking & startup work</p>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_300px] gap-4">
        <div className="flex flex-col gap-4">

          {/* Score + counters */}
          <div
            className="rounded-xl p-4"
            style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-start gap-6">
              <div className="flex flex-col items-center gap-1">
                <ScoreRing label="Founder Score" score={founderScore} size={96} />
                <p className="text-[10px] text-center" style={{ color: "var(--text-muted)" }}>this week</p>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-3">
                {counters.map(({ label, value, color }) => (
                  <div key={label} className="rounded-lg p-3" style={{ background: "var(--bg-soft)" }}>
                    <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
                    <p className="text-xl font-bold" style={{ color }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Log form */}
          <FounderLogForm existing={(todayLog ?? {}) as Record<string, unknown>} />

          {/* LinkedIn followers sparkline */}
          <div
            className="rounded-xl p-4"
            style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>LinkedIn Followers</h2>
              <span className="text-xl font-bold" style={{ color: "var(--founder)" }}>
                {latestFollowers > 0 ? latestFollowers.toLocaleString() : "—"}
              </span>
            </div>
            {filledSparkline.some((v) => v > 0) ? (
              <Sparkline values={filledSparkline} color="var(--founder)" width={400} height={48} />
            ) : (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Log your LinkedIn follower count daily to see the growth trend.
              </p>
            )}
          </div>
        </div>

        {/* Right column — tasks */}
        <div
          className="rounded-xl p-4 h-fit lg:sticky lg:top-6"
          style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>Founder Tasks</h2>
          <TaskList
            initialTasks={tasks as any}
            section="founder"
            defaultSection="founder"
          />
        </div>
      </div>
    </div>
  );
}
