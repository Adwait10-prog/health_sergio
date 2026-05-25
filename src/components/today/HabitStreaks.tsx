import type { DailyLogModel } from "@/generated/prisma/models/DailyLog";
import { calcHabitStreak } from "@/lib/scores";

interface HabitDef {
  field: keyof DailyLogModel;
  label: string;
  emoji: string;
  color: string;
}

const HABITS: HabitDef[] = [
  { field: "didWorkout",  label: "Workout",  emoji: "🏃", color: "var(--fitness)" },
  { field: "didCode",     label: "Code",     emoji: "💻", color: "var(--technical)" },
  { field: "didRead",     label: "Read",     emoji: "📖", color: "var(--gold)" },
  { field: "didLearn",    label: "Learn",    emoji: "🎓", color: "#8B5CF6" },
  { field: "didNetwork",  label: "Network",  emoji: "🤝", color: "var(--founder)" },
  { field: "didJournal",  label: "Journal",  emoji: "✍️", color: "var(--warn)" },
  { field: "didMeditate", label: "Meditate", emoji: "🧘", color: "#06B6D4" },
];

// Day labels for the 7 dots, newest-first → oldest is index 6
const DAY_LABELS = ["T", "Y", "2d", "3d", "4d", "5d", "6d"];

interface Props {
  logs: DailyLogModel[]; // last 7 days, newest first
}

export default function HabitStreaks({ logs }: Props) {
  const totalStreaks = HABITS.filter(({ field }) => calcHabitStreak(logs, field) > 0).length;

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Habit Streaks</h2>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{
            background: totalStreaks >= 5 ? "var(--accent-soft)" : "var(--bg-soft)",
            color: totalStreaks >= 5 ? "var(--accent-strong)" : "var(--text-muted)",
          }}>
          {totalStreaks} / {HABITS.length} active
        </span>
      </div>

      {/* Day header */}
      <div className="flex items-center gap-3 mb-2 pl-[calc(24px+12px+64px+12px)]">
        {DAY_LABELS.map((d) => (
          <div key={d} className="w-4 h-4 flex items-center justify-center">
            <span className="text-center leading-none" style={{ color: "var(--text-muted)", fontSize: 9, fontWeight: 600 }}>
              {d}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {HABITS.map(({ field, label, emoji, color }) => {
          const streak = calcHabitStreak(logs, field);
          const last7 = logs.slice(0, 7);
          const todayDone = last7[0]?.[field] === true;
          return (
            <div key={field} className="flex items-center gap-3">
              <span className="text-base w-6 text-center shrink-0">{emoji}</span>
              <span className="text-sm w-16 shrink-0 font-medium" style={{ color: todayDone ? "var(--text)" : "var(--text-dim)" }}>
                {label}
              </span>
              <div className="flex gap-1">
                {Array.from({ length: 7 }).map((_, i) => {
                  const done = last7[i]?.[field] === true;
                  const isToday = i === 0;
                  return (
                    <div
                      key={String(i)}
                      className="w-4 h-4 rounded-full transition-all"
                      style={{
                        background: done ? color : "var(--bg-soft)",
                        boxShadow: done && isToday ? `0 0 6px ${color}80` : "none",
                        transform: done && isToday ? "scale(1.15)" : "scale(1)",
                      }}
                    />
                  );
                })}
              </div>
              <span className="text-xs font-semibold ml-auto" style={{ color: streak > 0 ? color : "var(--text-muted)" }}>
                {streak > 0 ? `${streak}d 🔥` : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
