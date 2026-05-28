"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Tab = "daily" | "weekly" | "monthly";

const IDENTITY_SLIDERS = [
  { key: "leadershipScore",     label: "Leadership"      },
  { key: "confidenceScore",     label: "Confidence"      },
  { key: "communicationScore",  label: "Communication"   },
  { key: "technicalDepthScore", label: "Technical depth" },
  { key: "decisionMakingScore", label: "Decision making" },
  { key: "disciplineScore",     label: "Discipline"      },
];

interface Props {
  existingDaily?:   Record<string, unknown>;
  existingWeekly?:  Record<string, unknown>;
  existingMonthly?: Record<string, unknown>;
  existingReview?:  Record<string, unknown>;
}

export default function ReflectionForm({
  existingDaily   = {},
  existingWeekly  = {},
  existingMonthly = {},
  existingReview  = {},
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("daily");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Daily state
  const [journal,   setJournal]   = useState((existingDaily.journalText    as string) ?? "");
  const [lessons,   setLessons]   = useState((existingDaily.lessonsLearned as string) ?? "");
  const [gratitude, setGratitude] = useState((existingDaily.gratitudeItems as string) ?? "");

  // Weekly state
  const [wins,      setWins]      = useState((existingWeekly.weeklyWins    as string) ?? "");
  const [misses,    setMisses]    = useState((existingWeekly.weeklyMisses  as string) ?? "");
  const [focus,     setFocus]     = useState((existingWeekly.nextWeekFocus as string) ?? "");
  const [weekScore, setWeekScore] = useState((existingWeekly.weeklyScore   as number) ?? 7);

  // Monthly state
  const [proudScore, setProudScore] = useState((existingMonthly.amProudScore  as number) ?? 7);
  const [goalAlign,  setGoalAlign]  = useState((existingMonthly.goalAlignPct  as number) ?? 50);
  const [idActions,  setIdActions]  = useState((existingMonthly.identityActions as number) ?? 0);
  const [sliders, setSliders] = useState<Record<string, number>>(() =>
    Object.fromEntries(IDENTITY_SLIDERS.map(({ key }) => [key, (existingReview[key] as number) ?? 7]))
  );

  async function save() {
    setStatus("saving");
    const body: Record<string, unknown> = { type: tab };

    if (tab === "daily") {
      body.journalText    = journal;
      body.lessonsLearned = lessons;
      body.gratitudeItems = gratitude;
    } else if (tab === "weekly") {
      body.weeklyWins    = wins;
      body.weeklyMisses  = misses;
      body.nextWeekFocus = focus;
      body.weeklyScore   = weekScore;
    } else {
      body.amProudScore    = proudScore;
      body.goalAlignPct    = goalAlign;
      body.identityActions = idActions;
      Object.assign(body, sliders);
    }

    await fetch("/api/log/reflection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setStatus("saved");
    router.refresh();
    setTimeout(() => setStatus("idle"), 2500);
  }

  const accentColor = "var(--reflection)";

  const inputStyle: React.CSSProperties = {
    background: "var(--bg-soft)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "8px 12px",
    color: "var(--text)",
    fontSize: 13,
    width: "100%",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-muted)",
    display: "block",
    marginBottom: 4,
  };

  return (
    <div
      style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}
    >
      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, padding: 4, borderRadius: 8, background: "var(--bg-soft)" }}>
        {(["daily", "weekly", "monthly"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: "6px 0",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              textTransform: "capitalize",
              border: "none",
              cursor: "pointer",
              background: tab === t ? "var(--bg-card)" : "transparent",
              color: tab === t ? accentColor : "var(--text-muted)",
              boxShadow: tab === t ? "var(--shadow-sm)" : "none",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Daily */}
      {tab === "daily" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>Journal</label>
            <textarea
              value={journal}
              onChange={(e) => setJournal(e.target.value)}
              placeholder="What happened today? What are you thinking about?"
              rows={4}
              style={{ ...inputStyle, resize: "none" }}
            />
          </div>
          <div>
            <label style={labelStyle}>Lessons learned</label>
            <textarea
              value={lessons}
              onChange={(e) => setLessons(e.target.value)}
              placeholder="What did you learn today?"
              rows={2}
              style={{ ...inputStyle, resize: "none" }}
            />
          </div>
          <div>
            <label style={labelStyle}>Gratitude (one per line)</label>
            <textarea
              value={gratitude}
              onChange={(e) => setGratitude(e.target.value)}
              placeholder={"I'm grateful for…\nI'm grateful for…\nI'm grateful for…"}
              rows={3}
              style={{ ...inputStyle, resize: "none" }}
            />
          </div>
        </div>
      )}

      {/* Weekly */}
      {tab === "weekly" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>Wins this week</label>
            <textarea
              value={wins}
              onChange={(e) => setWins(e.target.value)}
              placeholder="What went well?"
              rows={3}
              style={{ ...inputStyle, resize: "none" }}
            />
          </div>
          <div>
            <label style={labelStyle}>Misses / lessons</label>
            <textarea
              value={misses}
              onChange={(e) => setMisses(e.target.value)}
              placeholder="What didn't go well? What would you do differently?"
              rows={3}
              style={{ ...inputStyle, resize: "none" }}
            />
          </div>
          <div>
            <label style={labelStyle}>Next week's focus</label>
            <textarea
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="What's the #1 thing to focus on next week?"
              rows={2}
              style={{ ...inputStyle, resize: "none" }}
            />
          </div>
          <div>
            <label style={labelStyle}>Week score — {weekScore}/10</label>
            <input
              type="range"
              min={1}
              max={10}
              value={weekScore}
              onChange={(e) => setWeekScore(Number(e.target.value))}
              style={{ width: "100%", accentColor }}
            />
          </div>
        </div>
      )}

      {/* Monthly */}
      {tab === "monthly" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Am I proud of this month? — {proudScore}/10</label>
              <input
                type="range"
                min={1}
                max={10}
                value={proudScore}
                onChange={(e) => setProudScore(Number(e.target.value))}
                style={{ width: "100%", accentColor }}
              />
            </div>
            <div>
              <label style={labelStyle}>Goal alignment — {goalAlign}%</label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={goalAlign}
                onChange={(e) => setGoalAlign(Number(e.target.value))}
                style={{ width: "100%", accentColor }}
              />
            </div>
            <div>
              <label style={labelStyle}>Identity actions this month</label>
              <input
                type="number"
                min={0}
                value={idActions}
                onChange={(e) => setIdActions(Number(e.target.value))}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", margin: "0 0 12px" }}>
              Identity sliders
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {IDENTITY_SLIDERS.map(({ key, label }) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 13, width: 144, flexShrink: 0, color: "var(--text-dim)" }}>{label}</span>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={sliders[key]}
                    onChange={(e) => setSliders((p) => ({ ...p, [key]: Number(e.target.value) }))}
                    style={{ flex: 1, accentColor }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600, width: 24, textAlign: "right", color: accentColor }}>
                    {sliders[key]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={save}
        disabled={status === "saving"}
        style={{
          background: status === "saved" ? "var(--accent-soft)" : accentColor,
          color: status === "saved" ? "var(--accent-strong)" : "#fff",
          border: "none",
          borderRadius: 10,
          padding: "10px 0",
          fontSize: 13,
          fontWeight: 700,
          width: "100%",
          cursor: "pointer",
          marginTop: 16,
          opacity: status === "saving" ? 0.7 : 1,
        }}
      >
        {status === "saved" ? "Saved ✓" : status === "saving" ? "Saving…" : `Save ${tab} reflection`}
      </button>
    </div>
  );
}
