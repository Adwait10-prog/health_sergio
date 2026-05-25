"use client";

import { useState } from "react";

const MOODS = ["😩","😔","😐","🙂","😊","😄","🤩"];

export default function QuickLog() {
  const [mood, setMood] = useState(5);
  const [stress, setStress] = useState(5);
  const [ateWell, setAteWell] = useState<boolean | null>(null);
  const [water, setWater] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  async function save() {
    setStatus("saving");
    await fetch("/api/log/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        moodScore: mood,
        stressLevel: stress,
        waterL: water ? parseFloat(water) : undefined,
        notes: notes || undefined,
      }),
    });
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2500);
  }

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
    >
      <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>Quick Log</h2>

      <div className="flex flex-col gap-3">
        {/* Mood */}
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
            Mood — {MOODS[Math.round((mood - 1) * (MOODS.length - 1) / 9)]}
          </label>
          <input
            type="range" min={1} max={10} value={mood}
            onChange={(e) => setMood(Number(e.target.value))}
            className="w-full accent-[var(--accent)]"
          />
        </div>

        {/* Stress */}
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
            Stress — {stress}/10
          </label>
          <input
            type="range" min={1} max={10} value={stress}
            onChange={(e) => setStress(Number(e.target.value))}
            className="w-full accent-[var(--warn)]"
          />
        </div>

        {/* Ate well */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Ate well?</span>
          {[true, false].map((v) => (
            <button
              key={String(v)}
              onClick={() => setAteWell(v)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
              style={{
                background: ateWell === v ? (v ? "var(--accent-soft)" : "#FEE2E2") : "var(--bg-soft)",
                color: ateWell === v ? (v ? "var(--accent-strong)" : "#DC2626") : "var(--text-dim)",
              }}
            >
              {v ? "Yes" : "No"}
            </button>
          ))}
        </div>

        {/* Water */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium shrink-0" style={{ color: "var(--text-muted)" }}>Water (L)</span>
          <input
            type="number" step="0.1" min="0" max="10"
            value={water} onChange={(e) => setWater(e.target.value)}
            placeholder="2.5"
            className="w-24 px-2 py-1 rounded-lg text-sm border"
            style={{ borderColor: "var(--border)", background: "var(--bg-soft)", color: "var(--text)" }}
          />
        </div>

        {/* Notes */}
        <textarea
          value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Any notes for today…"
          rows={2}
          className="w-full px-3 py-2 rounded-lg text-sm border resize-none"
          style={{ borderColor: "var(--border)", background: "var(--bg-soft)", color: "var(--text)" }}
        />

        <button
          onClick={save}
          disabled={status === "saving"}
          className="w-full py-2 rounded-lg text-sm font-semibold transition-colors"
          style={{ background: "var(--accent)", color: "#fff", opacity: status === "saving" ? 0.7 : 1 }}
        >
          {status === "saved" ? "Saved ✓" : status === "saving" ? "Saving…" : "Save quick log"}
        </button>
      </div>
    </div>
  );
}
