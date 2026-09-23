"use client";

import { useState, useMemo } from "react";
import type { MediaTicket } from "@/app/work/analysis/page";
import type { TicketAnalysis } from "@/app/api/asana/analyze-tickets/route";
import { DASHBOARD_TOKENS, MONO, softFill } from "./dashboardTokens";

const navPill: React.CSSProperties = {
  fontSize: 12.5, color: "var(--t2)", textDecoration: "none",
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 9, padding: "9px 14px", fontWeight: 500, boxShadow: "var(--shadow-sm)", whiteSpace: "nowrap",
};
const monoMicro: React.CSSProperties = {
  fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase",
};

// tech-problem verdict → color + label
const TECH: Record<string, { color: string; label: string }> = {
  yes: { color: "var(--green)", label: "Tech problem" },
  partial: { color: "var(--amber)", label: "Partly tech" },
  no: { color: "var(--t4)", label: "Not tech" },
};
const AUTO: Record<string, { color: string; label: string }> = {
  high: { color: "var(--green)", label: "HIGH" },
  medium: { color: "var(--amber)", label: "MEDIUM" },
  low: { color: "var(--t3)", label: "LOW" },
  none: { color: "var(--t4)", label: "NONE" },
};

function dueMeta(dueOn: string | null): { text: string; color: string } | null {
  if (!dueOn) return null;
  const days = Math.round((new Date(dueOn + "T00:00:00Z").getTime() - Date.now()) / 86400000);
  if (days < 0) return { text: `overdue ${-days}d`, color: "var(--amber)" };
  if (days === 0) return { text: "due today", color: "var(--amber)" };
  if (days <= 7) return { text: `due ${days}d`, color: "var(--blue)" };
  return { text: dueOn, color: "var(--t4)" };
}

export default function AnalysisBoard({ tickets, totalIncomplete }: { tickets: MediaTicket[]; totalIncomplete: number }) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(tickets.filter(t => t.preselected).map(t => t.asanaGid))
  );
  const [analyses, setAnalyses] = useState<Record<string, TicketAnalysis>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const selectedTickets = useMemo(
    () => tickets.filter(t => selected.has(t.asanaGid)),
    [tickets, selected]
  );

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
    <div style={{ ...DASHBOARD_TOKENS, padding: "32px 40px 80px" }}>
      <div>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ ...monoMicro, letterSpacing: ".16em", color: "var(--accent)", marginBottom: 11 }}>Media Squad · Tech Triage</div>
            <h1 style={{ fontSize: 31, fontWeight: 700, letterSpacing: "-.025em", margin: 0, lineHeight: 1.04 }}>Ticket Analysis</h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <a href="/work/roadmap" style={navPill}>Roadmap →</a>
            <a href="/work" style={navPill}>← Work board</a>
          </div>
        </div>
        <p style={{ fontSize: 13, color: "var(--t3)", margin: "14px 0 24px", maxWidth: 740, lineHeight: 1.6 }}>
          Top tickets are auto-ranked by stage and due-date urgency ({totalIncomplete} incomplete total). Search to add any other ticket, then analyze. Claude assesses each: <span style={{ color: "var(--t1)", fontWeight: 600 }}>is it even a tech problem?</span> and <span style={{ color: "var(--t1)", fontWeight: 600 }}>is there an automation opportunity?</span>
        </p>

        {/* Keyword search */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 13, padding: 16, boxShadow: "var(--shadow-sm)", marginBottom: 16 }}>
          <div style={{ ...monoMicro, fontSize: 10.5, color: "var(--t4)", marginBottom: 9 }}>Add tickets by keyword</div>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search ticket name, description, section, assignee…"
            style={{
              width: "100%", boxSizing: "border-box", fontSize: 13, padding: "10px 12px",
              borderRadius: 9, border: "1px solid var(--border)", background: "var(--surface-2)",
              color: "var(--t1)", outline: "none", fontFamily: "inherit",
            }}
          />
          {query.trim() && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
              {searchResults.length === 0 && (
                <div style={{ fontSize: 12, color: "var(--t4)", padding: "4px 2px" }}>No unselected tickets match &ldquo;{query}&rdquo;.</div>
              )}
              {searchResults.map(t => (
                <button key={t.asanaGid} onClick={() => { toggle(t.asanaGid); setQuery(""); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left", cursor: "pointer", background: "transparent", border: "none", padding: "7px 8px", borderRadius: 8, width: "100%" }}>
                  <span style={{ fontSize: 14, color: "var(--green)", flexShrink: 0 }}>＋</span>
                  <span style={{ fontSize: 12.5, color: "var(--t1)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                  {t.sectionName && <span style={{ fontSize: 10, color: "var(--t4)", whiteSpace: "nowrap" }}>{t.sectionName}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Run row */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
          <button onClick={runAnalysis} disabled={loading || selected.size === 0} style={{
            fontSize: 13, fontWeight: 700, color: "#fff",
            background: loading || selected.size === 0 ? "var(--t4)" : "var(--accent)",
            border: "none", borderRadius: 10, padding: "11px 20px",
            cursor: loading || selected.size === 0 ? "default" : "pointer",
          }}>
            {loading ? "Analyzing tickets…" : hasResults ? `Re-analyze ${selected.size}` : `Analyze ${selected.size} ticket${selected.size === 1 ? "" : "s"}`}
          </button>
          {hasResults && !loading && (
            <span style={{ fontSize: 11.5, color: "var(--t4)" }}>{Object.keys(analyses).length} tickets assessed</span>
          )}
          {error && <span style={{ fontSize: 12, color: "var(--amber)" }}>{error}</span>}
        </div>

        {/* Selected tickets */}
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          {selectedTickets.map((t, i) => {
            const a = analyses[t.asanaGid];
            const due = dueMeta(t.dueOn);
            const tech = a ? TECH[a.isTechProblem] : null;
            const auto = a ? AUTO[a.automationOpportunity] : null;
            return (
              <div key={t.asanaGid} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
                {/* header */}
                <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 9 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ display: "flex", gap: 11, alignItems: "baseline", minWidth: 0 }}>
                      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: "var(--t4)", flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                      <a href={t.permalink ?? "#"} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 14.5, fontWeight: 700, color: "var(--t1)", letterSpacing: "-.01em", lineHeight: 1.3, textDecoration: "none" }}>{t.name}</a>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                      {a && tech && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 600, color: tech.color, background: softFill(tech.color), borderRadius: 20, padding: "3px 10px", whiteSpace: "nowrap" }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: tech.color }} />{tech.label}
                        </span>
                      )}
                      {!a && (
                        <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--t4)", border: "1px solid var(--border)", borderRadius: 20, padding: "3px 9px", whiteSpace: "nowrap" }}>Pending</span>
                      )}
                      <button onClick={() => toggle(t.asanaGid)} title="Remove from analysis"
                        style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--t4)", fontSize: 16, lineHeight: 1, padding: "0 2px" }}>×</button>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 9, flexWrap: "wrap", fontSize: 11, color: "var(--t4)", alignItems: "center" }}>
                    {t.sectionName && <span style={{ background: "var(--surface-2)", borderRadius: 6, padding: "2px 8px" }}>{t.sectionName}</span>}
                    {t.assigneeName && <span>{t.assigneeName}</span>}
                    {due && <span style={{ color: due.color, fontWeight: 600 }}>{due.text}</span>}
                  </div>
                  {!a && t.notes && (
                    <p style={{ fontSize: 12, color: "var(--t3)", margin: "2px 0 0", lineHeight: 1.5, maxWidth: 720 }}>
                      {t.notes.replace(/^#.*$/gm, "").replace(/\s+/g, " ").trim().slice(0, 180)}{t.notes.length > 180 ? "…" : ""}
                    </p>
                  )}
                </div>

                {/* analysis */}
                {a && tech && auto && (
                  <div style={{ borderTop: "1px solid var(--border)", background: "var(--surface-2)", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 15 }}>
                    <div>
                      <div style={{ ...monoMicro, color: tech.color, marginBottom: 6 }}>Is it a tech problem?</div>
                      <p style={{ fontSize: 12.5, color: "var(--t1)", margin: 0, lineHeight: 1.55 }}>{a.techVerdict}</p>
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
                        <span style={{ ...monoMicro, color: auto.color }}>Automation opportunity</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 600, color: auto.color, background: softFill(auto.color), borderRadius: 20, padding: "2px 9px" }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: auto.color }} />{auto.label}
                        </span>
                      </div>
                      <p style={{ fontSize: 12.5, color: "var(--t1)", margin: 0, lineHeight: 1.55 }}>{a.automationIdea}</p>
                    </div>
                    <div style={{ borderLeft: "3px solid var(--accent)", paddingLeft: 13 }}>
                      <div style={{ ...monoMicro, color: "var(--accent)", marginBottom: 4 }}>Recommendation</div>
                      <p style={{ fontSize: 12.5, color: "var(--t1)", margin: 0, lineHeight: 1.55, fontWeight: 500 }}>{a.recommendation}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {selectedTickets.length === 0 && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, boxShadow: "var(--shadow-sm)", padding: 20, textAlign: "center", color: "var(--t4)", fontSize: 13 }}>
              No tickets selected. Search above to add tickets for analysis.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
