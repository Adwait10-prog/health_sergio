"use client";

import { useState } from "react";
import { format } from "date-fns";

interface Entry {
  id: string;
  date: Date | string;
  journalText?: string | null;
  weeklyScore?: number | null;
  gratitudeItems?: string | null;
  lessonsLearned?: string | null;
  weeklyWins?: string | null;
  nextWeekFocus?: string | null;
}

const MOODS = ["😩","😔","😐","🙂","😊","😄","🤩"];
function moodEmoji(score: number | null | undefined) {
  if (score == null) return null;
  return MOODS[Math.round((score - 1) * (MOODS.length - 1) / 9)] ?? null;
}

function scoreColor(score: number | null | undefined, accent: string) {
  if (score == null) return "var(--text-3)";
  if (score >= 8) return accent;
  if (score >= 6) return "var(--c-today)";
  return "var(--c-warn)";
}

export default function JournalHistoryCards({
  entries,
  accentColor,
}: {
  entries: Entry[];
  accentColor: string;
}) {
  const [open, setOpen] = useState<Entry | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Edit state
  const [editText, setEditText] = useState("");
  const [editGratitude, setEditGratitude] = useState("");
  const [editLessons, setEditLessons] = useState("");
  const [editScore, setEditScore] = useState<number | null>(null);

  function openEntry(e: Entry) {
    setOpen(e);
    setEditMode(false);
    setSaved(false);
    setEditText((e.journalText as string) ?? "");
    setEditGratitude((e.gratitudeItems as string) ?? "");
    setEditLessons((e.lessonsLearned as string) ?? "");
    setEditScore(e.weeklyScore ?? null);
  }

  function closeModal() {
    setOpen(null);
    setEditMode(false);
    setSaved(false);
  }

  async function saveEdit() {
    if (!open) return;
    setSaving(true);
    await fetch("/api/reflection/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: open.id,
        journalText: editText || null,
        gratitudeItems: editGratitude || null,
        lessonsLearned: editLessons || null,
        weeklyScore: editScore,
      }),
    });
    setSaving(false);
    setSaved(true);
    setEditMode(false);
    // Update the local entry so modal reflects edits without full reload
    setOpen({
      ...open,
      journalText: editText || null,
      gratitudeItems: editGratitude || null,
      lessonsLearned: editLessons || null,
      weeklyScore: editScore,
    });
  }

  if (entries.length === 0) return null;

  return (
    <>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)", margin: 0 }}>Journal History</h2>
        <span style={{ fontSize: 12, color: "var(--text-4)" }}>{entries.length} entries · scroll →</span>
      </div>

      {/* Horizontal scroll row */}
      <div style={{
        display: "flex",
        gap: 14,
        overflowX: "auto",
        paddingBottom: 12,
        scrollbarWidth: "thin",
        scrollbarColor: "var(--border) transparent",
      }}>
        {entries.map((entry) => {
          const dateStr = format(new Date(entry.date), "EEE, d MMM");
          const preview = (entry.journalText as string | null)?.slice(0, 120);
          const hasContent = entry.journalText || entry.gratitudeItems || entry.lessonsLearned;

          return (
            <div
              key={entry.id}
              onClick={() => openEntry(entry)}
              style={{
                flexShrink: 0,
                width: 220,
                background: "var(--surface)",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                padding: "16px 18px",
                boxShadow: "var(--shadow)",
                cursor: "pointer",
                transition: "transform 0.12s, box-shadow 0.12s",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow)";
              }}
            >
              {/* Date + score */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: accentColor, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {dateStr}
                </span>
                {entry.weeklyScore != null && (
                  <span style={{
                    fontSize: 12, fontWeight: 800,
                    color: scoreColor(entry.weeklyScore, accentColor),
                    background: scoreColor(entry.weeklyScore, accentColor) + "15",
                    padding: "2px 8px", borderRadius: 10,
                  }}>
                    {entry.weeklyScore}/10
                  </span>
                )}
              </div>

              {/* Journal preview */}
              {preview ? (
                <p style={{
                  fontSize: 12, lineHeight: 1.6, color: "var(--text-2)",
                  margin: 0, fontStyle: "italic",
                  display: "-webkit-box", WebkitLineClamp: 4,
                  WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>
                  "{preview}{(entry.journalText as string).length > 120 ? "…" : ""}"
                </p>
              ) : (
                <p style={{ fontSize: 11, color: "var(--text-4)", margin: 0, fontStyle: "italic" }}>No journal text</p>
              )}

              {/* Footer chips */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: "auto" }}>
                {entry.gratitudeItems && (
                  <span style={{ fontSize: 10, background: accentColor + "15", color: accentColor, padding: "2px 7px", borderRadius: 8, fontWeight: 600 }}>🙏 Gratitude</span>
                )}
                {entry.lessonsLearned && (
                  <span style={{ fontSize: 10, background: "var(--c-today-bg)", color: "var(--c-today)", padding: "2px 7px", borderRadius: 8, fontWeight: 600 }}>💡 Lessons</span>
                )}
                {!hasContent && (
                  <span style={{ fontSize: 10, color: "var(--text-4)", fontStyle: "italic" }}>Empty entry</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {open && (
        <div
          onClick={closeModal}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "var(--surface)",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
              width: "100%", maxWidth: 600,
              maxHeight: "85vh",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Modal header */}
            <div style={{
              padding: "18px 22px",
              borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexShrink: 0,
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: accentColor, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
                  {format(new Date(open.date), "EEEE, d MMMM yyyy")}
                </div>
                {open.weeklyScore != null && !editMode && (
                  <div style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 500 }}>
                    Day score: <strong style={{ color: scoreColor(open.weeklyScore, accentColor) }}>{open.weeklyScore}/10</strong>
                    {moodEmoji(open.weeklyScore) && <span style={{ marginLeft: 6 }}>{moodEmoji(open.weeklyScore)}</span>}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {!editMode && (
                  <button
                    onClick={() => setEditMode(true)}
                    style={{
                      fontSize: 12, fontWeight: 600,
                      color: accentColor, background: accentColor + "15",
                      border: "none", borderRadius: 8,
                      padding: "6px 14px", cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    Edit
                  </button>
                )}
                {editMode && (
                  <>
                    <button
                      onClick={() => { setEditMode(false); }}
                      style={{
                        fontSize: 12, fontWeight: 600,
                        color: "var(--text-3)", background: "var(--bg-subtle)",
                        border: "none", borderRadius: 8,
                        padding: "6px 14px", cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      style={{
                        fontSize: 12, fontWeight: 600,
                        color: "#fff", background: saved ? "var(--c-fitness)" : accentColor,
                        border: "none", borderRadius: 8,
                        padding: "6px 14px", cursor: saving ? "not-allowed" : "pointer",
                        fontFamily: "inherit", opacity: saving ? 0.7 : 1,
                      }}
                    >
                      {saving ? "Saving…" : saved ? "✓ Saved" : "Save"}
                    </button>
                  </>
                )}
                <button
                  onClick={closeModal}
                  style={{
                    fontSize: 18, lineHeight: 1,
                    color: "var(--text-4)", background: "none",
                    border: "none", cursor: "pointer", padding: "4px 8px",
                    fontFamily: "inherit",
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal body — scrollable */}
            <div style={{ overflowY: "auto", padding: "22px", display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Score edit */}
              {editMode && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Day Score</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <input
                      type="range" min={1} max={10} value={editScore ?? 5}
                      onChange={e => setEditScore(Number(e.target.value))}
                      style={{ flex: 1, accentColor }}
                    />
                    <span style={{ fontSize: 15, fontWeight: 700, color: accentColor, minWidth: 36 }}>{editScore ?? "—"}/10</span>
                  </div>
                </div>
              )}

              {/* Journal text */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Journal</div>
                {editMode ? (
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    rows={6}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      padding: "10px 12px", fontSize: 13, lineHeight: 1.7,
                      border: "1px solid var(--border)", borderRadius: "var(--radius-xs)",
                      fontFamily: "inherit", outline: "none", resize: "vertical",
                      background: "var(--surface)", color: "var(--text-1)",
                    }}
                  />
                ) : (
                  <p style={{ fontSize: 13, lineHeight: 1.8, color: "var(--text-2)", margin: 0, whiteSpace: "pre-wrap" }}>
                    {(open.journalText as string) || <em style={{ color: "var(--text-4)" }}>No entry</em>}
                  </p>
                )}
              </div>

              {/* Gratitude */}
              {(open.gratitudeItems || editMode) && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>🙏 Gratitude</div>
                  {editMode ? (
                    <textarea
                      value={editGratitude}
                      onChange={e => setEditGratitude(e.target.value)}
                      rows={3}
                      placeholder="One per line…"
                      style={{
                        width: "100%", boxSizing: "border-box",
                        padding: "10px 12px", fontSize: 13, lineHeight: 1.7,
                        border: "1px solid var(--border)", borderRadius: "var(--radius-xs)",
                        fontFamily: "inherit", outline: "none", resize: "vertical",
                        background: "var(--surface)", color: "var(--text-1)",
                      }}
                    />
                  ) : (
                    <p style={{ fontSize: 13, lineHeight: 1.8, color: "var(--text-2)", margin: 0, whiteSpace: "pre-wrap" }}>
                      {open.gratitudeItems as string}
                    </p>
                  )}
                </div>
              )}

              {/* Lessons */}
              {(open.lessonsLearned || editMode) && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>💡 Lessons Learned</div>
                  {editMode ? (
                    <textarea
                      value={editLessons}
                      onChange={e => setEditLessons(e.target.value)}
                      rows={3}
                      placeholder="What did you learn today?"
                      style={{
                        width: "100%", boxSizing: "border-box",
                        padding: "10px 12px", fontSize: 13, lineHeight: 1.7,
                        border: "1px solid var(--border)", borderRadius: "var(--radius-xs)",
                        fontFamily: "inherit", outline: "none", resize: "vertical",
                        background: "var(--surface)", color: "var(--text-1)",
                      }}
                    />
                  ) : (
                    <p style={{ fontSize: 13, lineHeight: 1.8, color: "var(--text-2)", margin: 0, whiteSpace: "pre-wrap" }}>
                      {open.lessonsLearned as string}
                    </p>
                  )}
                </div>
              )}

              {/* Weekly wins / next week focus (read-only, if exists) */}
              {open.weeklyWins && !editMode && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>✅ Weekly Wins</div>
                  <p style={{ fontSize: 13, lineHeight: 1.8, color: "var(--text-2)", margin: 0, whiteSpace: "pre-wrap" }}>{open.weeklyWins as string}</p>
                </div>
              )}
              {open.nextWeekFocus && !editMode && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>🎯 Next Week Focus</div>
                  <p style={{ fontSize: 13, lineHeight: 1.8, color: "var(--text-2)", margin: 0, whiteSpace: "pre-wrap" }}>{open.nextWeekFocus as string}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
