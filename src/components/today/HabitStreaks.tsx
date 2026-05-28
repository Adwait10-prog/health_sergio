"use client";
import { useState } from "react";
import { calcHabitStreak } from "@/lib/scores";
import type { DailyLogModel } from "@/generated/prisma/models/DailyLog";

interface HabitDef {
  field: keyof DailyLogModel;
  name: string;
  icon: string;
  color: string;
}

const HABITS: HabitDef[] = [
  { field: "didWorkout",  name: "Workout",  icon: "🏃", color: "var(--c-fitness)" },
  { field: "didCode",     name: "Code",     icon: "💻", color: "var(--c-technical)" },
  { field: "didRead",     name: "Read",     icon: "📖", color: "var(--c-today)" },
  { field: "didLearn",    name: "Learn",    icon: "🎓", color: "var(--c-founder)" },
  { field: "didNetwork",  name: "Network",  icon: "🤝", color: "var(--c-founder)" },
  { field: "didJournal",  name: "Journal",  icon: "✍️", color: "var(--c-reflection)" },
  { field: "didMeditate", name: "Meditate", icon: "🧘", color: "var(--c-reflection)" },
];

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const CELL = 36;
const GAP = 6;
const WEEK_W = 7 * CELL + 6 * GAP;
const LABEL_W = 130;
const WEEK_GAP = 24;

interface Props {
  logs: DailyLogModel[];
  today: Date;
}

function getMondayOf(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
}

export default function HabitStreaks({ logs, today }: Props) {
  const [showHistory, setShowHistory] = useState(false);

  const logMap = new Map<string, DailyLogModel>();
  for (const log of logs) {
    const istMs = new Date(log.date).getTime() + 5.5 * 60 * 60 * 1000;
    const dateStr = new Date(istMs).toISOString().split("T")[0];
    logMap.set(dateStr, log);
  }

  const istNow = new Date(today.getTime() + 5.5 * 60 * 60 * 1000);
  const todayIST = istNow.toISOString().split("T")[0];
  const currentMonday = getMondayOf(today);

  const weeks = Array.from({ length: 4 }, (_, wi) => {
    const monday = new Date(currentMonday);
    monday.setDate(currentMonday.getDate() - wi * 7);
    const days = Array.from({ length: 7 }, (_, di) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + di);
      const dateStr = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
      ].join("-");
      return { dateStr, date: d.getDate(), isFuture: dateStr > todayIST, isToday: dateStr === todayIST };
    });
    const label = wi === 0 ? "This week"
      : wi === 1 ? "Last week"
      : MONTH_NAMES[monday.getMonth()] + " " + monday.getDate();
    return { days, label, isCurrentWeek: wi === 0 };
  });

  const thisWeek = weeks[0];
  const pastWeeks = weeks.slice(1);
  const activeCount = HABITS.filter((h) => calcHabitStreak(logs, h.field) > 0).length;

  function DayCells({ week, h, stretch }: { week: typeof weeks[0]; h: typeof HABITS[0]; stretch?: boolean }) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: stretch ? "repeat(7, 1fr)" : `repeat(7, ${CELL}px)`, gap: GAP, width: stretch ? "100%" : undefined }}>
        {week.days.map((day, di) => {
          const log = logMap.get(day.dateStr);
          const done = log?.[h.field] === true;
          const isFut = day.isFuture && week.isCurrentWeek;
          return (
            <div key={di} style={{ display: "flex", justifyContent: "center" }}>
              <div style={{
                width: CELL, height: CELL, borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: isFut ? "var(--bg-subtle)" : done ? h.color : day.isToday ? "var(--surface)" : "var(--bg-subtle)",
                border: isFut
                  ? "1.5px dashed var(--border)"
                  : done ? "none"
                  : day.isToday ? "2px dashed " + h.color + "70"
                  : "1.5px solid var(--border-light)",
                opacity: isFut ? 0.4 : 1,
                boxShadow: done ? "0 1px 4px " + h.color + "40" : "none",
              }}>
                {done && (
                  <svg width="14" height="14" viewBox="0 0 14 14">
                    <path d="M3 7l3 3 5-5" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function DayHeaders({ week, stretch }: { week: typeof weeks[0]; stretch?: boolean }) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: stretch ? "repeat(7, 1fr)" : `repeat(7, ${CELL}px)`, gap: GAP, width: stretch ? "100%" : undefined }}>
        {DAY_LABELS.map((d, di) => {
          const day = week.days[di];
          return (
            <div key={di} style={{ textAlign: "center", width: CELL }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: day.isToday ? "var(--c-today)" : "var(--text-4)" }}>{d}</div>
              <div style={{ fontSize: 10, color: day.isToday ? "var(--c-today)" : "var(--text-4)", opacity: 0.6, marginTop: 1 }}>{day.date}</div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{
      background: "var(--surface)",
      borderRadius: "var(--radius)",
      border: "1px solid var(--border)",
      padding: 28,
      boxShadow: "var(--shadow)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-1)", margin: 0 }}>Habit Streaks</h2>
        <span style={{
          fontSize: 12, fontWeight: 600, color: "var(--c-today)",
          background: "var(--c-today-bg)", padding: "4px 12px", borderRadius: 20,
        }}>
          {activeCount} / {HABITS.length} active
        </span>
      </div>

      {/* Scrollable area — only active when history is shown */}
      <div style={{
        overflowX: showHistory ? "auto" : "visible",
        scrollbarWidth: "thin",
        scrollbarColor: "var(--border) transparent",
      }}>
        <div style={{ width: "100%" }}>

          {/* Column headers */}
          <div style={{ display: "flex", alignItems: "flex-end", marginBottom: 8 }}>
            <div style={{ width: LABEL_W, flexShrink: 0 }} />

            {/* This week */}
            <div style={{ flex: showHistory ? "0 0 auto" : 1, marginRight: showHistory ? WEEK_GAP : 0, minWidth: 0 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase",
                color: "var(--c-today)", marginBottom: 6,
              }}>This week</div>
              <DayHeaders week={thisWeek} stretch={!showHistory} />
            </div>

            {/* Past weeks */}
            {showHistory && pastWeeks.map((week, wi) => (
              <div key={wi} style={{ flexShrink: 0, marginRight: wi < 2 ? WEEK_GAP : 0 }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase",
                  color: "var(--text-4)", marginBottom: 6,
                }}>{week.label}</div>
                <DayHeaders week={week} />
              </div>
            ))}
          </div>

          {/* Habit rows */}
          {HABITS.map((h, hi) => {
            const streak = calcHabitStreak(logs, h.field);
            return (
              <div key={h.field} style={{
                display: "flex",
                alignItems: "center",
                padding: "6px 0",
                borderTop: hi === 0 ? "1px solid var(--border-light)" : "none",
                borderBottom: "1px solid var(--border-light)",
              }}>
                {/* Label */}
                <div style={{ width: LABEL_W, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{h.icon}</span>
                  <span style={{
                    fontSize: 13, fontWeight: 600,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    color: streak > 0 ? "var(--text-1)" : "var(--text-3)",
                  }}>{h.name}</span>
                </div>

                {/* This week */}
                <div style={{ flex: showHistory ? "0 0 auto" : 1, marginRight: showHistory ? WEEK_GAP : 0, minWidth: 0 }}>
                  <DayCells week={thisWeek} h={h} stretch={!showHistory} />
                </div>

                {/* Past weeks */}
                {showHistory && pastWeeks.map((week, wi) => (
                  <div key={wi} style={{ flexShrink: 0, marginRight: wi < 2 ? WEEK_GAP : 0 }}>
                    <DayCells week={week} h={h} />
                  </div>
                ))}

                {/* Streak badge */}
                <div style={{ marginLeft: 12, minWidth: 60, textAlign: "right", flexShrink: 0 }}>
                  {streak > 0 ? (
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: h.color, background: h.color + "15",
                      padding: "3px 9px", borderRadius: 12, whiteSpace: "nowrap",
                    }}>{streak}d 🔥</span>
                  ) : (
                    <span style={{ fontSize: 13, color: "var(--text-4)" }}>—</span>
                  )}
                </div>
              </div>
            );
          })}

        </div>
      </div>

      {/* Toggle */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        style={{
          marginTop: 12,
          fontSize: 12, fontWeight: 600,
          color: "var(--text-3)",
          background: "none", border: "none", cursor: "pointer",
          padding: 0, display: "flex", alignItems: "center", gap: 5,
        }}
      >
        <span style={{
          display: "inline-block",
          transform: showHistory ? "rotate(90deg)" : "rotate(-90deg)",
          transition: "transform 0.2s",
          fontSize: 9, opacity: 0.7,
        }}>▼</span>
        {showHistory ? "Hide history" : "Show past 3 weeks"}
      </button>
    </div>
  );
}
