"use client";

import { useState, useMemo } from "react";
import type { MediaTicket } from "@/app/work/analysis/page";
import type { TicketAnalysis } from "@/app/api/asana/analyze-tickets/route";

const CARD: React.CSSProperties = {
  background: "var(--surface)",
  borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderLeftWidth: 1,
  borderStyle: "solid",
  borderTopColor: "var(--border)", borderRightColor: "var(--border)",
  borderBottomColor: "var(--border)", borderLeftColor: "var(--border)",
  borderRadius: 14,
  padding: 20,
  boxShadow: "var(--shadow)",
};
const LABEL: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 700, color: "var(--text-4)",
  textTransform: "uppercase", letterSpacing: "0.08em",
};
const navBtn: React.CSSProperties = {
  fontSize: 12, color: "var(--text-3)", textDecoration: "none",
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 8, padding: "8px 12px", whiteSpace: "nowrap",
};

const TECH_COLOR: Record<string, string> = {
  yes: "var(--c-fitness)", partial: "var(--c-today)", no: "var(--text-4)",
};
const TECH_LABEL: Record<string, string> = {
  yes: "Tech problem", partial: "Partly tech", no: "Not tech",
};
const AUTO_COLOR: Record<string, string> = {
  high: "var(--c-fitness)", medium: "var(--c-today)", low: "var(--text-3)", none: "var(--text-4)",
};

function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 600, color,
      background: `color-mix(in srgb, ${color} 12%, transparent)`,
      borderRadius: 20, padding: "3px 10px", whiteSpace: "nowrap",
      display: "inline-flex", alignItems: "center", gap: 5,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />{text}
    </span>
  );
}

// Is a due date overdue / soon?
function dueMeta(dueOn: string | null): { text: string; color: string } | null {
  if (!dueOn) return null;
  const days = Math.round((new Date(dueOn + "T00:00:00Z").getTime() - Date.now()) / 86400000);
  if (days < 0) return { text: `overdue ${-days}d`, color: "var(--warn)" };
  if (days === 0) return { text: "due today", color: "var(--warn)" };
  if (days <= 7) return { text: `due ${days}d`, color: "var(--c-today)" };
  return { text: `due ${dueOn}`, color: "var(--text-4)" };
}

export default function AnalysisBoard({ tickets, totalIncomplete }: { tickets: MediaTicket[]; totalIncomplete: number }) {
  // Selection set — start with the preselected top-ranked tickets.
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(tickets.filter(t => t.preselected).map(t => t.asanaGid))
  );
  const [analyses, setAnalyses] = useState<Record<string, TicketAnalysis>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const byGid = useMemo(() => new Map(tickets.map(t => [t.asanaGid, t])), [tickets]);
  const selectedTickets = useMemo(
    () => tickets.filter(t => selected.has(t.asanaGid)),
    [tickets, selected]
  );

  // Keyword search results — tickets NOT already selected, matching the query.
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return tickets
      .filter(t => !selected.has(t.asanaGid))
      .filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.notes ?? "").toLowerCase().includes(q) ||
        (t.sectionName ?? "").toLowerCase().includes(q) ||
        (t.assigneeName ?? "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [query, tickets, selected]);

  function toggle(gid: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(gid)) next.delete(gid); else next.add(gid);
      return next;
    });
  }

  async function runAnalysis() {
    if (selected.size === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/asana/analyze-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskGids: Array.from(selected) }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Analysis failed");
      const map: Record<string, TicketAnalysis> = {};
      for (const a of data.analyses as TicketAnalysis[]) map[a.taskGid] = a;
      setAnalyses(map);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }

  const hasResults = Object.keys(analyses).length > 0;

  return (
    <div style={{ padding: "40px 44px 96px", maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ ...LABEL, color: "var(--c-technical)", marginBottom: 6 }}>Media Squad · Tech Triage</div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: "var(--text-1)", margin: 0, letterSpacing: "-0.035em" }}>
            Ticket Analysis
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="/work/roadmap" style={navBtn}>Roadmap →</a>
          <a href="/work" style={navBtn}>← Work board</a>
        </div>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--text-3)", margin: "10px 0 22px", maxWidth: 730, lineHeight: 1.6 }}>
        Top tickets are auto-ranked by stage and due-date urgency ({totalIncomplete} incomplete total). Search to add any other ticket, then analyze. Claude assesses each: <strong style={{ color: "var(--text-2)" }}>is it even a tech problem?</strong> and <strong style={{ color: "var(--text-2)" }}>is there an automation opportunity?</strong>
      </p>

      {/* Keyword search to add tickets */}
      <div style={{ ...CARD, marginBottom: 16, padding: 16 }}>
        <div style={{ ...LABEL, marginBottom: 8 }}>Add tickets by keyword</div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search ticket name, description, section, assignee…"
          style={{
            width: "100%", boxSizing: "border-box", fontSize: 13, padding: "10px 12px",
            borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg-subtle)",
            color: "var(--text-1)", outline: "none",
          }}
        />
        {query.trim() && (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
            {searchResults.length === 0 && (
              <div style={{ fontSize: 12, color: "var(--text-4)", padding: "4px 2px" }}>No unselected tickets match &ldquo;{query}&rdquo;.</div>
            )}
            {searchResults.map(t => (
              <button key={t.asanaGid} onClick={() => { toggle(t.asanaGid); setQuery(""); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10, textAlign: "left", cursor: "pointer",
                  background: "transparent", border: "none", padding: "7px 8px", borderRadius: 8, width: "100%",
                }}>
                <span style={{ fontSize: 14, color: "var(--c-fitness)", flexShrink: 0 }}>＋</span>
                <span style={{ fontSize: 12.5, color: "var(--text-1)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                {t.sectionName && <span style={{ fontSize: 10, color: "var(--text-4)", whiteSpace: "nowrap" }}>{t.sectionName}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Run button */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        <button
          onClick={runAnalysis}
          disabled={loading || selected.size === 0}
          style={{
            fontSize: 13, fontWeight: 700, color: "#fff",
            background: loading || selected.size === 0 ? "var(--text-4)" : "var(--c-technical)",
            border: "none", borderRadius: 10, padding: "11px 20px",
            cursor: loading || selected.size === 0 ? "default" : "pointer", display: "flex", alignItems: "center", gap: 8,
          }}
        >
          {loading ? "Analyzing tickets…" : hasResults ? `↻ Re-analyze ${selected.size}` : `✦ Analyze ${selected.size} ticket${selected.size === 1 ? "" : "s"}`}
        </button>
        {hasResults && !loading && (
          <span style={{ fontSize: 11.5, color: "var(--text-4)" }}>{Object.keys(analyses).length} tickets assessed</span>
        )}
        {error && <span style={{ fontSize: 12, color: "var(--warn)" }}>⚠ {error}</span>}
      </div>

      {/* Selected tickets */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {selectedTickets.map((t, i) => {
          const a = analyses[t.asanaGid];
          const due = dueMeta(t.dueOn);
          return (
            <div key={t.asanaGid} style={{ ...CARD, padding: 0, overflow: "hidden" }}>
              {/* Ticket header */}
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "baseline", minWidth: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-4)", fontVariantNumeric: "tabular-nums" }}>{String(i + 1).padStart(2, "0")}</span>
                    <a href={t.permalink ?? "#"} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text-1)", textDecoration: "none", letterSpacing: "-0.01em" }}>
                      {t.name}
                    </a>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                    {a && <Pill text={TECH_LABEL[a.isTechProblem]} color={TECH_COLOR[a.isTechProblem] ?? "var(--text-4)"} />}
                    <button onClick={() => toggle(t.asanaGid)} title="Remove from analysis"
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-4)", fontSize: 16, lineHeight: 1, padding: "0 2px" }}>×</button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11, color: "var(--text-4)", alignItems: "center" }}>
                  {t.sectionName && <span style={{ background: "var(--bg-subtle)", borderRadius: 6, padding: "2px 8px" }}>{t.sectionName}</span>}
                  {t.assigneeName && <span>{t.assigneeName}</span>}
                  {due && <span style={{ color: due.color, fontWeight: 600 }}>{due.text}</span>}
                </div>
                {!a && t.notes && (
                  <p style={{ fontSize: 12, color: "var(--text-3)", margin: "2px 0 0", lineHeight: 1.5, maxWidth: 720 }}>
                    {t.notes.replace(/^#.*$/gm, "").replace(/\s+/g, " ").trim().slice(0, 180)}{t.notes.length > 180 ? "…" : ""}
                  </p>
                )}
              </div>

              {/* Analysis result */}
              {a && (
                <div style={{ borderTop: "1px solid var(--border)", background: "var(--bg-subtle)", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <div style={{ ...LABEL, marginBottom: 6, color: TECH_COLOR[a.isTechProblem] ?? "var(--text-4)" }}>Is it a tech problem?</div>
                    <p style={{ fontSize: 12.5, color: "var(--text-1)", margin: 0, lineHeight: 1.55 }}>{a.techVerdict}</p>
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ ...LABEL, color: AUTO_COLOR[a.automationOpportunity] ?? "var(--text-4)" }}>Automation opportunity</span>
                      <Pill text={a.automationOpportunity.toUpperCase()} color={AUTO_COLOR[a.automationOpportunity] ?? "var(--text-4)"} />
                    </div>
                    <p style={{ fontSize: 12.5, color: "var(--text-1)", margin: 0, lineHeight: 1.55 }}>{a.automationIdea}</p>
                  </div>
                  <div style={{ borderLeft: "3px solid var(--c-technical)", paddingLeft: 12 }}>
                    <div style={{ ...LABEL, marginBottom: 4, color: "var(--c-technical)" }}>Recommendation</div>
                    <p style={{ fontSize: 12.5, color: "var(--text-1)", margin: 0, lineHeight: 1.55, fontWeight: 500 }}>{a.recommendation}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {selectedTickets.length === 0 && (
          <div style={{ ...CARD, textAlign: "center", color: "var(--text-4)", fontSize: 13 }}>
            No tickets selected. Search above to add tickets for analysis.
          </div>
        )}
      </div>
    </div>
  );
}
