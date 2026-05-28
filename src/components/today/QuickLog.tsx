"use client";

import { useState } from "react";

const MOODS = ["😩","😔","😐","🙂","😊","😄","🤩"];

const HABITS = [
  { key: "didRead",     label: "Read",     icon: "📖" },
  { key: "didJournal",  label: "Journal",  icon: "✍️" },
  { key: "didMeditate", label: "Meditate", icon: "🧘" },
  { key: "didWorkout",  label: "Workout",  icon: "🏃" },
  { key: "didCode",     label: "Code",     icon: "💻" },
  { key: "didLearn",    label: "Learn",    icon: "🎓" },
  { key: "didNetwork",  label: "Network",  icon: "🤝" },
];

export default function QuickLog() {
  const [mood, setMood]       = useState(5);
  const [stress, setStress]   = useState(5);
  const [water, setWater]     = useState("");
  const [notes, setNotes]     = useState("");
  const [habits, setHabits]   = useState<Record<string, boolean>>({});
  const [status, setStatus]   = useState<"idle" | "saving" | "saved">("idle");

  function toggleHabit(key: string) {
    setHabits(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function save() {
    setStatus("saving");
    await fetch("/api/log/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        moodScore:    mood,
        stressLevel:  stress,
        waterL:       water ? parseFloat(water) : undefined,
        notes:        notes || undefined,
        ...habits,
      }),
    });
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2500);
  }

  return (
    <div style={{
      background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)",
      padding: 20, boxShadow: "var(--shadow)",
    }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)", margin: "0 0 16px" }}>Quick Log</h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Habits */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Today's habits</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {HABITS.map(({ key, label, icon }) => {
              const on = !!habits[key];
              return (
                <button key={key} onClick={() => toggleHabit(key)} style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "6px 12px", fontSize: 12, fontWeight: 600,
                  border: on ? "none" : "1.5px solid var(--border)",
                  borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
                  background: on ? "var(--c-today)" : "var(--bg-subtle)",
                  color: on ? "#fff" : "var(--text-3)",
                  transition: "all 0.12s",
                }}>
                  <span style={{ fontSize: 13 }}>{icon}</span>
                  {label}
                  {on && <span style={{ fontSize: 10, opacity: 0.8 }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mood */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-3)" }}>Mood — {MOODS[Math.round((mood - 1) * (MOODS.length - 1) / 9)]}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--c-fitness)" }}>{mood}/10</span>
          </div>
          <input type="range" min={1} max={10} value={mood} onChange={(e) => setMood(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--c-fitness)" }} />
        </div>

        {/* Stress */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-3)" }}>Stress</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--c-founder)" }}>{stress}/10</span>
          </div>
          <input type="range" min={1} max={10} value={stress} onChange={(e) => setStress(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--c-founder)" }} />
        </div>

        {/* Water */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-3)" }}>💧 Water (L)</span>
          <input type="number" step={0.5} min={0} max={10} value={water} onChange={(e) => setWater(e.target.value)} placeholder="2.5"
            style={{ width: 70, padding: "6px 10px", fontSize: 13, fontWeight: 600, border: "1px solid var(--border)", borderRadius: "var(--radius-xs)", textAlign: "center", fontFamily: "inherit", outline: "none", background: "var(--surface)", color: "var(--text-1)" }} />
        </div>

        {/* Notes */}
        <input placeholder="Any notes for today…" value={notes} onChange={(e) => setNotes(e.target.value)}
          style={{ padding: "9px 12px", fontSize: 13, border: "1px solid var(--border)", borderRadius: "var(--radius-xs)", fontFamily: "inherit", outline: "none", background: "var(--surface)", color: "var(--text-1)", width: "100%", boxSizing: "border-box" }} />

        <button onClick={save} disabled={status === "saving"} style={{
          width: "100%", padding: "10px 0", fontSize: 13, fontWeight: 600,
          color: "#fff", background: status === "saved" ? "var(--c-fitness)" : "var(--c-today)",
          border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", fontFamily: "inherit",
          opacity: status === "saving" ? 0.7 : 1, transition: "background 0.2s",
        }}>
          {status === "saved" ? "✓ Saved!" : status === "saving" ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
