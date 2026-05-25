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
  const [journal,     setJournal]     = useState((existingDaily.journalText    as string) ?? "");
  const [lessons,     setLessons]     = useState((existingDaily.lessonsLearned as string) ?? "");
  const [gratitude,   setGratitude]   = useState((existingDaily.gratitudeItems as string) ?? "");

  // Weekly state
  const [wins,        setWins]        = useState((existingWeekly.weeklyWins    as string) ?? "");
  const [misses,      setMisses]      = useState((existingWeekly.weeklyMisses  as string) ?? "");
  const [focus,       setFocus]       = useState((existingWeekly.nextWeekFocus as string) ?? "");
  const [weekScore,   setWeekScore]   = useState((existingWeekly.weeklyScore   as number) ?? 7);

  // Monthly state
  const [proudScore,  setProudScore]  = useState((existingMonthly.amProudScore  as number) ?? 7);
  const [goalAlign,   setGoalAlign]   = useState((existingMonthly.goalAlignPct  as number) ?? 50);
  const [idActions,   setIdActions]   = useState((existingMonthly.identityActions as number) ?? 0);
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

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
    >
      {/* Tab switcher */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ background: "var(--bg-soft)" }}>
        {(["daily", "weekly", "monthly"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors"
            style={{
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
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Journal</label>
            <textarea
              value={journal} onChange={(e) => setJournal(e.target.value)}
              placeholder="What happened today? What are you thinking about?"
              rows={4}
              className="w-full px-3 py-2 rounded-lg text-sm border resize-none"
              style={{ borderColor: "var(--border)", background: "var(--bg-soft)", color: "var(--text)" }}
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Lessons learned</label>
            <textarea
              value={lessons} onChange={(e) => setLessons(e.target.value)}
              placeholder="What did you learn today?"
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm border resize-none"
              style={{ borderColor: "var(--border)", background: "var(--bg-soft)", color: "var(--text)" }}
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Gratitude (one per line)</label>
            <textarea
              value={gratitude} onChange={(e) => setGratitude(e.target.value)}
              placeholder={"I'm grateful for…\nI'm grateful for…\nI'm grateful for…"}
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm border resize-none"
              style={{ borderColor: "var(--border)", background: "var(--bg-soft)", color: "var(--text)" }}
            />
          </div>
        </div>
      )}

      {/* Weekly */}
      {tab === "weekly" && (
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Wins this week</label>
            <textarea
              value={wins} onChange={(e) => setWins(e.target.value)}
              placeholder="What went well?"
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm border resize-none"
              style={{ borderColor: "var(--border)", background: "var(--bg-soft)", color: "var(--text)" }}
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Misses / lessons</label>
            <textarea
              value={misses} onChange={(e) => setMisses(e.target.value)}
              placeholder="What didn't go well? What would you do differently?"
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm border resize-none"
              style={{ borderColor: "var(--border)", background: "var(--bg-soft)", color: "var(--text)" }}
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Next week's focus</label>
            <textarea
              value={focus} onChange={(e) => setFocus(e.target.value)}
              placeholder="What's the #1 thing to focus on next week?"
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm border resize-none"
              style={{ borderColor: "var(--border)", background: "var(--bg-soft)", color: "var(--text)" }}
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
              Week score — {weekScore}/10
            </label>
            <input
              type="range" min={1} max={10} value={weekScore}
              onChange={(e) => setWeekScore(Number(e.target.value))}
              className="w-full"
              style={{ accentColor }}
            />
          </div>
        </div>
      )}

      {/* Monthly */}
      {tab === "monthly" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
                Am I proud of this month? — {proudScore}/10
              </label>
              <input
                type="range" min={1} max={10} value={proudScore}
                onChange={(e) => setProudScore(Number(e.target.value))}
                className="w-full" style={{ accentColor }}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
                Goal alignment — {goalAlign}%
              </label>
              <input
                type="range" min={0} max={100} step={5} value={goalAlign}
                onChange={(e) => setGoalAlign(Number(e.target.value))}
                className="w-full" style={{ accentColor }}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Identity actions this month</label>
              <input
                type="number" min={0} value={idActions}
                onChange={(e) => setIdActions(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-lg text-sm border"
                style={{ borderColor: "var(--border)", background: "var(--bg-soft)", color: "var(--text)" }}
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>
              Identity sliders
            </p>
            <div className="flex flex-col gap-3">
              {IDENTITY_SLIDERS.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-sm w-36 shrink-0" style={{ color: "var(--text-dim)" }}>{label}</span>
                  <input
                    type="range" min={1} max={10} value={sliders[key]}
                    onChange={(e) => setSliders((p) => ({ ...p, [key]: Number(e.target.value) }))}
                    className="flex-1" style={{ accentColor }}
                  />
                  <span className="text-sm font-semibold w-6 text-right" style={{ color: accentColor }}>
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
        className="w-full mt-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        style={{
          background: status === "saved" ? "var(--accent-soft)" : accentColor,
          color: status === "saved" ? "var(--accent-strong)" : "#fff",
          opacity: status === "saving" ? 0.7 : 1,
        }}
      >
        {status === "saved" ? "Saved ✓" : status === "saving" ? "Saving…" : `Save ${tab} reflection`}
      </button>
    </div>
  );
}
