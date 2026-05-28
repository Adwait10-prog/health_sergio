import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";
import { startOfDay, startOfWeek, startOfMonth, subDays, format } from "date-fns";
import ReflectionForm from "@/components/reflection/ReflectionForm";
import PageSidebar from "@/components/layout/PageSidebar";
import JournalHistoryCards from "@/components/reflection/JournalHistoryCards";

export const dynamic = "force-dynamic";

export default async function ReflectionPage() {
  const userId = getUserId();
  const now        = new Date();
  const today      = startOfDay(now);
  const weekStart  = startOfDay(startOfWeek(now, { weekStartsOn: 1 }));
  const monthStart = startOfDay(startOfMonth(now));
  const monthKey   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const last30Start = subDays(today, 30);
  const last7Start  = subDays(today, 7);

  const [dailyEntry, weeklyEntry, monthlyEntry, monthlyReview, last30Daily, last5Daily, last7DailyLogs] = await Promise.all([
    db.reflection.findFirst({ where: { userId, date: today,      type: "daily"   } }),
    db.reflection.findFirst({ where: { userId, date: weekStart,  type: "weekly"  } }),
    db.reflection.findFirst({ where: { userId, date: monthStart, type: "monthly" } }),
    db.monthlyReview.findFirst({ where: { userId, month: monthKey } }),
    db.reflection.findMany({
      where: { userId, type: "daily", date: { gte: last30Start } },
      orderBy: { date: "desc" },
    }),
    db.reflection.findMany({
      where: { userId, type: "daily" },
      orderBy: { date: "desc" },
      take: 20,
    }),
    db.dailyLog.findMany({
      where: { userId, date: { gte: last7Start } },
      orderBy: { date: "desc" },
    }),
  ]);

  // Stats
  const journalDaysThisMonth = last30Daily.filter(e => {
    const d = new Date(e.date);
    return d >= monthStart;
  }).length;
  const daysInMonthSoFar = today.getDate();
  const journalPct = daysInMonthSoFar > 0 ? Math.round((journalDaysThisMonth / daysInMonthSoFar) * 100) : 0;

  // Journal streak (consecutive days ending today)
  let journalStreak = 0;
  for (let i = 0; i < 30; i++) {
    const d = subDays(today, i);
    const key = format(d, "yyyy-MM-dd");
    const found = last30Daily.find(e => format(new Date(e.date), "yyyy-MM-dd") === key);
    if (found) journalStreak++;
    else break;
  }

  // Weekly score from current weekly entry
  const weeklyScore = weeklyEntry?.weeklyScore ?? null;

  // Avg mood last 7 days
  const moodLogs = last7DailyLogs.filter(l => l.moodScore != null);
  const avgMood = moodLogs.length > 0
    ? Math.round(moodLogs.reduce((s, l) => s + (l.moodScore ?? 0), 0) / moodLogs.length * 10) / 10
    : null;

  // Avg energy last 7 days
  const energyLogs = last7DailyLogs.filter(l => l.energyLevel != null);
  const avgEnergy = energyLogs.length > 0
    ? Math.round(energyLogs.reduce((s, l) => s + (l.energyLevel ?? 0), 0) / energyLogs.length * 10) / 10
    : null;

  // All recent entries for the history cards (includes today)
  const recentEntries = last5Daily;

  const accentColor = "var(--c-reflection)";

  return (
    <div style={{ padding: "24px 20px" }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: accentColor, margin: 0 }}>Reflection</h1>
        <p style={{ fontSize: 13, color: "var(--text-3)", margin: "4px 0 0" }}>Journal · weekly review · monthly identity</p>
      </div>

      {/* ── Dashboard stats row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        {/* Journal streak */}
        <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: "16px 18px", boxShadow: "var(--shadow)" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Journal Streak</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: journalStreak > 0 ? accentColor : "var(--text-3)", lineHeight: 1 }}>{journalStreak}</span>
            <span style={{ fontSize: 13, color: "var(--text-3)" }}>days</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 4 }}>
            {journalStreak > 0 ? "Keep it going 🔥" : "Start today"}
          </div>
        </div>

        {/* This month consistency */}
        <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: "16px 18px", boxShadow: "var(--shadow)" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>This Month</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: journalPct >= 70 ? accentColor : journalPct >= 40 ? "var(--c-today)" : "var(--text-3)", lineHeight: 1 }}>{journalPct}%</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 4 }}>{journalDaysThisMonth} / {daysInMonthSoFar} days logged</div>
        </div>

        {/* Avg mood */}
        <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: "16px 18px", boxShadow: "var(--shadow)" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Avg Mood · 7d</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: avgMood != null ? (avgMood >= 7 ? accentColor : avgMood >= 5 ? "var(--c-today)" : "var(--c-warn)") : "var(--text-3)", lineHeight: 1 }}>
              {avgMood ?? "—"}
            </span>
            {avgMood != null && <span style={{ fontSize: 13, color: "var(--text-3)" }}>/10</span>}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 4 }}>
            {avgMood == null ? "Log mood daily" : avgMood >= 7 ? "Feeling good 😊" : avgMood >= 5 ? "Holding steady" : "Rough week 😔"}
          </div>
        </div>

        {/* Avg energy */}
        <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: "16px 18px", boxShadow: "var(--shadow)" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Avg Energy · 7d</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: avgEnergy != null ? (avgEnergy >= 7 ? accentColor : avgEnergy >= 5 ? "var(--c-today)" : "var(--c-warn)") : "var(--text-3)", lineHeight: 1 }}>
              {avgEnergy ?? "—"}
            </span>
            {avgEnergy != null && <span style={{ fontSize: 13, color: "var(--text-3)" }}>/10</span>}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 4 }}>
            {avgEnergy == null ? "Log energy daily" : avgEnergy >= 7 ? "High energy ⚡" : avgEnergy >= 5 ? "Moderate" : "Low energy 😴"}
          </div>
        </div>
      </div>

      {/* Monthly identity scores */}
      {monthlyReview && (
        <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: "18px 20px", boxShadow: "var(--shadow)", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)", margin: 0 }}>{format(now, "MMMM yyyy")} Identity Scores</h2>
            {monthlyReview.overallScore != null && (
              <span style={{ fontSize: 12, fontWeight: 600, color: accentColor, background: "var(--c-reflection-bg)", padding: "3px 10px", borderRadius: 20 }}>
                Overall {monthlyReview.overallScore}/10
              </span>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
            {[
              { label: "Leadership",    value: monthlyReview.leadershipScore,     icon: "👑" },
              { label: "Confidence",    value: monthlyReview.confidenceScore,     icon: "💪" },
              { label: "Communication", value: monthlyReview.communicationScore,  icon: "🗣️" },
              { label: "Tech depth",    value: monthlyReview.technicalDepthScore, icon: "🧠" },
              { label: "Decisions",     value: monthlyReview.decisionMakingScore, icon: "⚖️" },
              { label: "Discipline",    value: monthlyReview.disciplineScore,     icon: "🎯" },
            ].map(({ label, value, icon }) => (
              <div key={label} style={{ background: "var(--bg-subtle)", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: value != null ? accentColor : "var(--text-3)", lineHeight: 1 }}>{value ?? "—"}</div>
                <div style={{ fontSize: 10, color: "var(--text-4)", marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Two-column: form + sidebar ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>

        {/* Left — form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ReflectionForm
            existingDaily={   (dailyEntry    ?? {}) as Record<string, unknown>}
            existingWeekly={  (weeklyEntry   ?? {}) as Record<string, unknown>}
            existingMonthly={ (monthlyEntry  ?? {}) as Record<string, unknown>}
            existingReview={  (monthlyReview ?? {}) as Record<string, unknown>}
          />
        </div>

        {/* Right — sidebar + journal history */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <PageSidebar section="reflection" accentColor={accentColor} />

          {/* Weekly review summary */}
          {weeklyEntry && (
            <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: 18, boxShadow: "var(--shadow)" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: accentColor, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>This Week's Review</div>
              {weeklyEntry.weeklyScore != null && (
                <div style={{ fontSize: 24, fontWeight: 800, color: accentColor, marginBottom: 8 }}>{weeklyEntry.weeklyScore}/10</div>
              )}
              {weeklyEntry.weeklyWins && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-4)", marginBottom: 3 }}>WINS</div>
                  <p style={{ fontSize: 12, color: "var(--text-2)", margin: 0, lineHeight: 1.5 }}>
                    {(weeklyEntry.weeklyWins as string).slice(0, 120)}
                  </p>
                </div>
              )}
              {weeklyEntry.nextWeekFocus && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-4)", marginBottom: 3 }}>FOCUS NEXT WEEK</div>
                  <p style={{ fontSize: 12, color: "var(--text-2)", margin: 0, lineHeight: 1.5 }}>
                    {(weeklyEntry.nextWeekFocus as string).slice(0, 120)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Journal history — full width horizontal scroll ── */}
      {recentEntries.length > 0 && (
        <div style={{
          marginTop: 28,
          background: "var(--surface)",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          padding: "22px 24px",
          boxShadow: "var(--shadow)",
        }}>
          <JournalHistoryCards
            entries={recentEntries.map(e => ({
              id: e.id,
              date: e.date,
              journalText: e.journalText as string | null,
              weeklyScore: e.weeklyScore,
              gratitudeItems: e.gratitudeItems as string | null,
              lessonsLearned: e.lessonsLearned as string | null,
              weeklyWins: e.weeklyWins as string | null,
              nextWeekFocus: e.nextWeekFocus as string | null,
            }))}
            accentColor={accentColor}
          />
        </div>
      )}
    </div>
  );
}
