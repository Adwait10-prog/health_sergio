"use client";

import { useState } from "react";
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

export default function AnalysisBoard({ tickets, totalIncomplete }: { tickets: MediaTicket[]; totalIncomplete: number }) {
  const [analyses, setAnalyses] = useState<Record<string, TicketAnalysis>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/asana/analyze-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskGids: tickets.map(t => t.asanaGid) }),
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
      <p style={{ fontSize: 12.5, color: "var(--text-3)", margin: "10px 0 24px", maxWidth: 720, lineHeight: 1.6 }}>
        Top {tickets.length} active Media Squad tickets ({totalIncomplete} incomplete total). Claude reads each ticket name, description, and comments and assesses: <strong style={{ color: "var(--text-2)" }}>is it even a tech problem?</strong> and <strong style={{ color: "var(--text-2)" }}>is there an automation opportunity?</strong>
      </p>

      {/* Run button */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <button
          onClick={runAnalysis}
          disabled={loading}
          style={{
            fontSize: 13, fontWeight: 700, color: "#fff",
            background: loading ? "var(--text-4)" : "var(--c-technical)",
            border: "none", borderRadius: 10, padding: "11px 20px",
            cursor: loading ? "default" : "pointer", display: "flex", alignItems: "center", gap: 8,
          }}
        >
          {loading ? "Analyzing tickets…" : hasResults ? "↻ Re-analyze" : "✦ Analyze tickets"}
        </button>
        {hasResults && !loading && (
          <span style={{ fontSize: 11.5, color: "var(--text-4)" }}>Analysis complete · {Object.keys(analyses).length} tickets assessed</span>
        )}
        {error && <span style={{ fontSize: 12, color: "var(--warn)" }}>⚠ {error}</span>}
      </div>

      {/* Tickets */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {tickets.map((t, i) => {
          const a = analyses[t.asanaGid];
          return (
            <div key={t.asanaGid} style={{ ...CARD, padding: 0, overflow: "hidden" }}>
              {/* Ticket header */}
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "baseline", minWidth: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-4)", fontVariantNumeric: "tabular-nums" }}>0{i + 1}</span>
                    <a href={t.permalink ?? "#"} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text-1)", textDecoration: "none", letterSpacing: "-0.01em" }}>
                      {t.name}
                    </a>
                  </div>
                  {a && (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <Pill text={TECH_LABEL[a.isTechProblem]} color={TECH_COLOR[a.isTechProblem] ?? "var(--text-4)"} />
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11, color: "var(--text-4)" }}>
                  {t.sectionName && <span style={{ background: "var(--bg-subtle)", borderRadius: 6, padding: "2px 8px" }}>{t.sectionName}</span>}
                  {t.assigneeName && <span>{t.assigneeName}</span>}
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
                  {/* Is it tech? */}
                  <div>
                    <div style={{ ...LABEL, marginBottom: 6, color: TECH_COLOR[a.isTechProblem] ?? "var(--text-4)" }}>Is it a tech problem?</div>
                    <p style={{ fontSize: 12.5, color: "var(--text-1)", margin: 0, lineHeight: 1.55 }}>{a.techVerdict}</p>
                  </div>
                  {/* Automation */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ ...LABEL, color: AUTO_COLOR[a.automationOpportunity] ?? "var(--text-4)" }}>Automation opportunity</span>
                      <Pill text={a.automationOpportunity.toUpperCase()} color={AUTO_COLOR[a.automationOpportunity] ?? "var(--text-4)"} />
                    </div>
                    <p style={{ fontSize: 12.5, color: "var(--text-1)", margin: 0, lineHeight: 1.55 }}>{a.automationIdea}</p>
                  </div>
                  {/* Recommendation */}
                  <div style={{ borderLeft: "3px solid var(--c-technical)", paddingLeft: 12 }}>
                    <div style={{ ...LABEL, marginBottom: 4, color: "var(--c-technical)" }}>Recommendation</div>
                    <p style={{ fontSize: 12.5, color: "var(--text-1)", margin: 0, lineHeight: 1.55, fontWeight: 500 }}>{a.recommendation}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {tickets.length === 0 && (
          <div style={{ ...CARD, textAlign: "center", color: "var(--text-4)", fontSize: 13 }}>
            No incomplete Media Squad tickets found. Sync Asana first.
          </div>
        )}
      </div>
    </div>
  );
}
