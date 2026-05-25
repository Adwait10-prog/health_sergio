import type { DailyLogModel } from "@/generated/prisma/models/DailyLog";

interface Props {
  log: DailyLogModel | null;
}

function StatPill({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div
      className="rounded-lg px-3 py-2 flex flex-col"
      style={{
        background: good ? "var(--accent-soft)" : "var(--bg-soft)",
        border: good ? "1px solid #BBF7D0" : "1px solid transparent",
      }}
    >
      <span className="text-xs leading-none mb-1" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="text-sm font-semibold leading-none" style={{ color: good ? "var(--accent-strong)" : "var(--text)" }}>
        {value}
      </span>
    </div>
  );
}

export default function YesterdayRecap({ log }: Props) {
  if (!log) {
    return (
      <div
        className="rounded-xl p-4"
        style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-sm font-semibold mb-2" style={{ color: "var(--text)" }}>Yesterday</h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          No vitals logged yet.{" "}
          <a href="/log" className="underline" style={{ color: "var(--accent)" }}>Log now →</a>
        </p>
      </div>
    );
  }

  const sleepH = log.sleepMin ? (log.sleepMin / 60).toFixed(1) : null;
  const sleepGood = log.sleepMin ? log.sleepMin >= 420 : false; // ≥7h
  const rhrGood = log.rhrBpm ? log.rhrBpm <= 60 : false;
  const energyGood = log.energyLevel ? log.energyLevel >= 7 : false;
  const tasksRate = log.tasksPlanned && log.tasksPlanned > 0
    ? Math.round(((log.tasksCompleted ?? 0) / log.tasksPlanned) * 100)
    : null;

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
    >
      <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>Yesterday's vitals</h2>
      <div className="grid grid-cols-3 gap-2">
        <StatPill label="😴 Sleep" value={sleepH ? `${sleepH}h` : "—"} good={sleepGood} />
        <StatPill label="❤️ RHR"   value={log.rhrBpm ? `${log.rhrBpm} bpm` : "—"} good={rhrGood} />
        <StatPill label="⚡ Energy" value={log.energyLevel ? `${log.energyLevel}/10` : "—"} good={energyGood} />
        <StatPill label="😤 Stress" value={log.stressLevel ? `${log.stressLevel}/10` : "—"} />
        <StatPill label="💧 Water"  value={log.waterL ? `${log.waterL}L` : "—"} good={(log.waterL ?? 0) >= 2} />
        <StatPill
          label="✅ Tasks"
          value={log.tasksPlanned ? `${log.tasksCompleted ?? 0}/${log.tasksPlanned}` : "—"}
          good={tasksRate !== null && tasksRate >= 80}
        />
      </div>
      {log.kcal && (
        <div className="mt-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            🍽️ {log.kcal} kcal
            {log.proteinG ? ` · ${log.proteinG}g protein` : ""}
          </p>
        </div>
      )}
      {log.notes && (
        <div className="mt-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-xs italic" style={{ color: "var(--text-dim)" }}>&ldquo;{log.notes}&rdquo;</p>
        </div>
      )}
    </div>
  );
}
