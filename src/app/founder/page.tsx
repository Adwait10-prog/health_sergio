import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";
import { startOfDay, subDays, startOfWeek } from "date-fns";
import { calcWeeklyFounderScore } from "@/lib/scores";
import ScoreRing from "@/components/today/ScoreRing";
import FounderLogForm from "@/components/founder/FounderLogForm";
import Sparkline from "@/components/ui/Sparkline";
import PageSidebar from "@/components/layout/PageSidebar";

export const dynamic = "force-dynamic";

export default async function FounderPage() {
  const userId = getUserId();
  const today     = startOfDay(new Date());
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  const [todayLog, weekLogs, last30Logs] = await Promise.all([
    db.founderLog.findFirst({ where: { userId, date: today } }),
    db.founderLog.findMany({ where: { userId, date: { gte: weekStart } } }),
    db.founderLog.findMany({
      where: { userId, date: { gte: subDays(today, 30) } },
      orderBy: { date: "asc" },
    }),
  ]);

  const founderScore = calcWeeklyFounderScore(weekLogs);

  const weekConnections = weekLogs.reduce((s, l) => s + (l.newPeopleMet ?? 0) + (l.highValueConnections ?? 0), 0);
  const weekStartup     = weekLogs.reduce((s, l) => s + (l.ideasResearched ?? 0) + (l.validationCalls ?? 0) + (l.pitchesPrepared ?? 0), 0);
  const weekPosts       = weekLogs.reduce((s, l) => s + (l.linkedinPosts ?? 0), 0);
  const weekOutreach    = weekLogs.reduce((s, l) => s + (l.investorOutreach ?? 0) + (l.followUpsDone ?? 0), 0);

  const latestFollowers = [...last30Logs].reverse().find((l) => l.linkedinFollowers != null)?.linkedinFollowers ?? 0;
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
    <div style={{ padding: "24px 20px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--founder)", margin: 0 }}>Founder</h1>
        <p style={{ fontSize: 13, marginTop: 2, color: "var(--text-muted)", margin: "2px 0 0" }}>This week's networking &amp; startup work</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Score + counters */}
          <div
            style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <ScoreRing label="Founder Score" score={founderScore} size={96} />
                <p style={{ fontSize: 10, textAlign: "center", color: "var(--text-muted)", margin: 0 }}>this week</p>
              </div>
              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {counters.map(({ label, value, color }) => (
                  <div key={label} style={{ background: "var(--bg-soft)", borderRadius: 8, padding: 12 }}>
                    <p style={{ fontSize: 12, marginBottom: 2, color: "var(--text-muted)", margin: "0 0 2px" }}>{label}</p>
                    <p style={{ fontSize: 20, fontWeight: 700, color, margin: 0 }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Log form */}
          <FounderLogForm existing={(todayLog ?? {}) as Record<string, unknown>} />

          {/* LinkedIn followers sparkline */}
          <div
            style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: 0 }}>LinkedIn Followers</h2>
              <span style={{ fontSize: 20, fontWeight: 700, color: "var(--founder)" }}>
                {latestFollowers > 0 ? latestFollowers.toLocaleString() : "—"}
              </span>
            </div>
            {filledSparkline.some((v) => v > 0) ? (
              <Sparkline values={filledSparkline} color="var(--founder)" width={400} height={48} />
            ) : (
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                Log your LinkedIn follower count daily to see the growth trend.
              </p>
            )}
          </div>
        </div>

        <PageSidebar section="founder" accentColor="var(--c-founder)" />
      </div>
    </div>
  );
}
