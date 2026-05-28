"use client";

import { useState } from "react";
import { format } from "date-fns";

interface MeetingNote {
  id: string;
  date: Date;
  title: string;
  attendees: string | null;
  summary: string | null;
  decisions: string | null;
  actionItems: string | null;
  rawTranscript: string | null;
}

export default function MeetingNoteCard({ note }: { note: MeetingNote }) {
  const [expanded, setExpanded] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [creatingTasks, setCreatingTasks] = useState(false);
  const [tasksCreated, setTasksCreated] = useState(false);

  const actionLines = note.actionItems
    ? note.actionItems.split("\n").filter(l => l.trim())
    : [];

  async function createTasksFromActions() {
    if (!actionLines.length) return;
    setCreatingTasks(true);
    try {
      await fetch("/api/meetings/create-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingNoteId: note.id, actionItems: actionLines }),
      });
      setTasksCreated(true);
    } finally {
      setCreatingTasks(false);
    }
  }

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      overflow: "hidden",
    }}>
      {/* Header row */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "14px 16px",
          cursor: "pointer",
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: "var(--c-founder-bg)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16,
        }}>
          🤝
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)", marginBottom: 2 }}>
            {note.title}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span>{format(new Date(note.date), "EEE, d MMM yyyy")}</span>
            {note.attendees && <span>· 👥 {note.attendees}</span>}
            {actionLines.length > 0 && (
              <span style={{ color: "var(--c-today)", fontWeight: 600 }}>
                · {actionLines.length} action item{actionLines.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        <div style={{ color: "var(--text-4)", fontSize: 12, marginTop: 2 }}>
          {expanded ? "▲" : "▼"}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>

          {/* Summary */}
          {note.summary && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                Summary
              </div>
              <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0, lineHeight: 1.6 }}>
                {note.summary}
              </p>
            </div>
          )}

          {/* Decisions */}
          {note.decisions && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                Decisions
              </div>
              {note.decisions.split("\n").filter(l => l.trim()).map((d, i) => (
                <div key={i} style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 4, paddingLeft: 12, borderLeft: "2px solid var(--c-founder)" }}>
                  {d}
                </div>
              ))}
            </div>
          )}

          {/* Action items */}
          {actionLines.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                Action Items
              </div>
              {actionLines.map((item, i) => (
                <div key={i} style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 4, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ color: "var(--c-today)", marginTop: 1 }}>→</span>
                  <span>{item}</span>
                </div>
              ))}

              {/* Create tasks button */}
              {!tasksCreated ? (
                <button
                  onClick={createTasksFromActions}
                  disabled={creatingTasks}
                  style={{
                    marginTop: 10,
                    padding: "6px 14px",
                    background: "var(--c-today)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: creatingTasks ? "not-allowed" : "pointer",
                    opacity: creatingTasks ? 0.7 : 1,
                  }}
                >
                  {creatingTasks ? "Creating..." : "＋ Add to Today's Tasks"}
                </button>
              ) : (
                <div style={{ marginTop: 10, fontSize: 12, color: "var(--c-today)", fontWeight: 600 }}>
                  ✅ Tasks added to Today's list
                </div>
              )}
            </div>
          )}

          {/* Raw transcript toggle */}
          {note.rawTranscript && (
            <div style={{ marginTop: 12 }}>
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 11, color: "var(--text-4)", padding: 0,
                  textDecoration: "underline",
                }}
              >
                {showTranscript ? "Hide transcript" : "Show raw transcript"}
              </button>
              {showTranscript && (
                <p style={{
                  fontSize: 12, color: "var(--text-3)", marginTop: 8,
                  background: "var(--surface-2, #f5f5f5)",
                  padding: "10px 12px", borderRadius: 8,
                  lineHeight: 1.6, fontStyle: "italic",
                }}>
                  "{note.rawTranscript}"
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
