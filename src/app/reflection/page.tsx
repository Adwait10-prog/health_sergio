import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";
import { startOfDay, startOfWeek, startOfMonth, format } from "date-fns";
import ReflectionForm from "@/components/reflection/ReflectionForm";

export const dynamic = "force-dynamic";

export default async function ReflectionPage() {
  const userId = getUserId();
  const now       = new Date();
  const today     = startOfDay(now);
  const weekStart = startOfDay(startOfWeek(now, { weekStartsOn: 1 }));
  const monthStart = startOfDay(startOfMonth(now));
  const monthKey  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [dailyEntry, weeklyEntry, monthlyEntry, monthlyReview] = await Promise.all([
    db.reflection.findFirst({ where: { userId, date: today,      type: "daily"   } }),
    db.reflection.findFirst({ where: { userId, date: weekStart,  type: "weekly"  } }),
    db.reflection.findFirst({ where: { userId, date: monthStart, type: "monthly" } }),
    db.monthlyReview.findFirst({ where: { userId, month: monthKey } }),
  ]);

  const last5Daily = await db.reflection.findMany({
    where: { userId, type: "daily", ...(dailyEntry ? { NOT: { id: dailyEntry.id } } : {}) },
    orderBy: { date: "desc" },
    take: 5,
  });

  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--reflection)" }}>Reflection</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>Journal · weekly review · monthly identity</p>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_300px] gap-4">
        {/* Left — form */}
        <div className="flex flex-col gap-4">
          <ReflectionForm
            existingDaily={   (dailyEntry    ?? {}) as Record<string, unknown>}
            existingWeekly={  (weeklyEntry   ?? {}) as Record<string, unknown>}
            existingMonthly={ (monthlyEntry  ?? {}) as Record<string, unknown>}
            existingReview={  (monthlyReview ?? {}) as Record<string, unknown>}
          />

          {/* Monthly identity scores table */}
          {monthlyReview && (
            <div
              className="rounded-xl p-4"
              style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
            >
              <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>
                {format(now, "MMMM yyyy")} identity scores
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Leadership",    value: monthlyReview.leadershipScore     },
                  { label: "Confidence",    value: monthlyReview.confidenceScore     },
                  { label: "Communication", value: monthlyReview.communicationScore  },
                  { label: "Tech depth",    value: monthlyReview.technicalDepthScore },
                  { label: "Decisions",     value: monthlyReview.decisionMakingScore },
                  { label: "Discipline",    value: monthlyReview.disciplineScore     },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg p-2.5" style={{ background: "var(--bg-soft)" }}>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{label}</p>
                    <p className="text-lg font-bold" style={{ color: "var(--reflection)" }}>{value ?? "—"}</p>
                  </div>
                ))}
              </div>
              {monthlyReview.overallScore != null && (
                <p className="text-xs mt-3 text-right" style={{ color: "var(--text-muted)" }}>
                  Overall avg: <span className="font-semibold" style={{ color: "var(--reflection)" }}>{monthlyReview.overallScore}/10</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right — recent journal entries */}
        <div className="flex flex-col gap-3">
          {dailyEntry && (
            <div
              className="rounded-xl p-4"
              style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
            >
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--reflection)" }}>Today</p>
              {dailyEntry.journalText && (
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-dim)" }}>
                  {(dailyEntry.journalText as string).slice(0, 200)}
                  {(dailyEntry.journalText as string).length > 200 ? "…" : ""}
                </p>
              )}
            </div>
          )}

          {last5Daily.length > 0 && (
            <div
              className="rounded-xl p-4"
              style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
            >
              <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>Recent entries</h2>
              <div className="flex flex-col gap-3">
                {last5Daily.map((entry) => (
                  <div key={entry.id} className="pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
                    <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                      {format(new Date(entry.date), "EEE, d MMM")}
                    </p>
                    {entry.journalText ? (
                      <p className="text-sm leading-relaxed" style={{ color: "var(--text-dim)" }}>
                        {(entry.journalText as string).slice(0, 120)}
                        {(entry.journalText as string).length > 120 ? "…" : ""}
                      </p>
                    ) : (
                      <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>No journal text</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!dailyEntry && last5Daily.length === 0 && (
            <div
              className="rounded-xl p-4"
              style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
            >
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No journal entries yet. Start writing daily — even 2 sentences helps.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
