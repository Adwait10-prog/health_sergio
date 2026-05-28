import type { DailyLogModel } from "@/generated/prisma/models/DailyLog";

interface Props { log: DailyLogModel | null; label?: string; }

export default function YesterdayRecap({ log, label = "Today's vitals" }: Props) {
  if (!log) {
    return (
      <div style={{
        background: "var(--bg-subtle)", borderRadius: "var(--radius)", border: "1px solid var(--border-light)",
        padding: 20,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)" }}>{label}</span>
            <span style={{ fontSize: 13, color: "var(--text-3)", marginLeft: 12 }}>No vitals logged yet.</span>
          </div>
          <a href="/log" style={{ fontSize: 13, fontWeight: 600, color: "var(--c-today)", textDecoration: "none" }}>Log now →</a>
        </div>
      </div>
    );
  }

  const sleepH  = log.sleepMin ? (log.sleepMin / 60).toFixed(1) : null;
  const sleepGood = (log.sleepMin ?? 0) >= 420;
  const rhrGood   = (log.rhrBpm ?? 99) <= 60;
  const energyGood = (log.energyLevel ?? 0) >= 7;
  const waterGood  = (log.waterL ?? 0) >= 2;
  const tasksRate  = log.tasksPlanned ? Math.round(((log.tasksCompleted ?? 0) / log.tasksPlanned) * 100) : null;

  const stats = [
    { label: "😴 Sleep",  value: sleepH ? `${sleepH}h` : "—",                           good: sleepGood },
    { label: "❤️ RHR",    value: log.rhrBpm ? `${log.rhrBpm} bpm` : "—",               good: rhrGood },
    { label: "⚡ Energy",  value: log.energyLevel ? `${log.energyLevel}/10` : "—",      good: energyGood },
    { label: "😤 Stress",  value: log.stressLevel ? `${log.stressLevel}/10` : "—",      good: false },
    { label: "💧 Water",   value: log.waterL ? `${log.waterL}L` : "—",                  good: waterGood },
    { label: "✅ Tasks",   value: log.tasksPlanned ? `${log.tasksCompleted ?? 0}/${log.tasksPlanned}` : "—", good: (tasksRate ?? 0) >= 80 },
  ];

  return (
    <div style={{
      background: "var(--bg-subtle)", borderRadius: "var(--radius)", border: "1px solid var(--border-light)",
      padding: 20,
    }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)", margin: "0 0 14px" }}>{label}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {stats.map(({ label, value, good }) => (
          <div key={label} style={{
            background: good ? "var(--c-fitness-bg)" : "var(--surface)",
            borderRadius: "var(--radius-xs)", padding: "10px 12px",
            border: good ? "1px solid #A7E3BC" : "1px solid var(--border-light)",
          }}>
            <div style={{ fontSize: 11, color: "var(--text-4)", marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: good ? "var(--c-fitness)" : "var(--text-1)" }}>{value}</div>
          </div>
        ))}
      </div>
      {log.kcal && (
        <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 10 }}>
          🍽️ {log.kcal} kcal{log.proteinG ? ` · ${log.proteinG}g protein` : ""}
        </p>
      )}
      {log.notes && (
        <p style={{ fontSize: 12, fontStyle: "italic", color: "var(--text-3)", marginTop: 8 }}>
          &ldquo;{log.notes}&rdquo;
        </p>
      )}
    </div>
  );
}
