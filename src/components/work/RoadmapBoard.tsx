"use client";

import { useState } from "react";
import type { ThemeLiveStats } from "@/app/work/roadmap/page";
import {
  THEMES, HEALTH_METRICS, PRIORITIES, RND_WATCHLIST,
  RISK_REGISTER, TIMELINE, CTO_COMMENTARY,
  type RoadmapTheme, type RoadmapItem, type ThemeStatus, type ItemState,
} from "@/lib/roadmapData";

// ── Status → color ──────────────────────────────────────────────────────────
const STATUS_COLOR: Record<ThemeStatus, string> = {
  critical: "var(--warn)",
  active:   "var(--c-today)",
  planned:  "var(--c-fitness)",
  upcoming: "var(--text-4)",
};
const STATUS_DOT: Record<ThemeStatus, string> = {
  critical: "🔴", active: "🟡", planned: "🟢", upcoming: "⚪",
};
const STATUS_LABEL: Record<ThemeStatus, string> = {
  critical: "Critical", active: "Active", planned: "Planned", upcoming: "Upcoming",
};

const ITEM_MARK: Record<ItemState, { mark: string; color: string }> = {
  done:        { mark: "✓", color: "var(--c-fitness)" },
  in_progress: { mark: "◉", color: "var(--c-today)" },
  todo:        { mark: "□", color: "var(--text-4)" },
};

// ── Shared styles ─────────────────────────────────────────────────────────
const CARD: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  padding: 18,
  boxShadow: "var(--shadow)",
};
const LABEL: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: "var(--text-4)",
  textTransform: "uppercase", letterSpacing: "0.07em",
};

// ── Now / Next / Later column ───────────────────────────────────────────────
function PhaseColumn({ title, items, accent }: { title: string; items: RoadmapItem[]; accent: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ ...LABEL, color: accent, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {items.map((it, i) => {
          const m = ITEM_MARK[it.state];
          return (
            <div key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
              <span style={{ color: m.color, fontSize: 12, lineHeight: "17px", flexShrink: 0 }}>{m.mark}</span>
              <span style={{
                fontSize: 12, lineHeight: 1.4,
                color: it.state === "todo" ? "var(--text-3)" : "var(--text-1)",
                fontWeight: it.state === "in_progress" ? 600 : 400,
                textDecoration: it.state === "done" ? "none" : "none",
              }}>{it.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Theme card ──────────────────────────────────────────────────────────────
function ThemeCard({ theme, stats }: { theme: RoadmapTheme; stats?: ThemeLiveStats }) {
  const [open, setOpen] = useState(theme.status === "critical");
  const color = STATUS_COLOR[theme.status];
  const completionPct = stats && stats.totalTickets > 0
    ? Math.round((stats.completedTickets / stats.totalTickets) * 100)
    : null;

  return (
    <div style={{ ...CARD, borderLeft: `3px solid ${color}`, padding: 0, overflow: "hidden" }}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", textAlign: "left", background: "transparent", border: "none",
          padding: 16, cursor: "pointer", display: "flex", flexDirection: "column", gap: 8,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
            <span style={{ fontSize: 18 }}>{theme.emoji}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>
              {theme.id}. {theme.name}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, color,
              padding: "3px 9px", borderRadius: 20, background: `color-mix(in srgb, ${color} 12%, transparent)`,
              textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap",
            }}>{STATUS_DOT[theme.status]} {STATUS_LABEL[theme.status]}</span>
            <span style={{ fontSize: 13, color: "var(--text-4)", transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</span>
          </div>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--text-2)", margin: 0, lineHeight: 1.5 }}>{theme.objective}</p>
        {/* Live grounding chip row */}
        {stats && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
            {completionPct != null && (
              <span style={chip()}>📊 {completionPct}% done · {stats.totalTickets} tickets</span>
            )}
            {stats.inFlightTickets > 0 && (
              <span style={chip("var(--c-today)")}>◉ {stats.inFlightTickets} in flight</span>
            )}
          </div>
        )}
      </button>

      {/* Body */}
      {open && (
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Now / Next / Later */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }} className="roadmap-phases">
            <PhaseColumn title="Now" items={theme.now} accent="var(--warn)" />
            <PhaseColumn title="Next" items={theme.next} accent="var(--c-technical)" />
            <PhaseColumn title="Later" items={theme.later} accent="var(--text-4)" />
          </div>

          {/* Live matched tickets */}
          {stats && stats.matchedTicketNames.length > 0 && (
            <div style={{ background: "var(--bg-subtle)", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ ...LABEL, marginBottom: 6 }}>Live Asana tickets grounding this theme</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {stats.matchedTicketNames.map((n, i) => (
                  <div key={i} style={{ fontSize: 11.5, color: "var(--text-2)", display: "flex", gap: 6 }}>
                    <span style={{ color: "var(--c-today)" }}>◈</span>{n}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Why / Metrics / Risks grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="roadmap-detail-grid">
            <div>
              <div style={{ ...LABEL, marginBottom: 6 }}>Why it matters</div>
              <ul style={ulStyle}>{theme.whyItMatters.map((w, i) => <li key={i} style={liStyle}>{w}</li>)}</ul>
            </div>
            <div>
              <div style={{ ...LABEL, marginBottom: 6 }}>Success metrics</div>
              <ul style={ulStyle}>{theme.successMetrics.map((m, i) => <li key={i} style={liStyle}>{m}</li>)}</ul>
            </div>
          </div>

          {/* Risks + owner */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ ...LABEL, marginBottom: 6, color: "var(--warn)" }}>Risks</div>
              <ul style={ulStyle}>{theme.risks.map((r, i) => <li key={i} style={{ ...liStyle, color: "var(--text-2)" }}>{r}</li>)}</ul>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ ...LABEL, marginBottom: 4 }}>Owner</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-1)" }}>{theme.owner}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function chip(color = "var(--text-3)"): React.CSSProperties {
  return {
    fontSize: 10.5, fontWeight: 600, color,
    background: "var(--bg-subtle)", borderRadius: 20, padding: "3px 9px",
  };
}
const ulStyle: React.CSSProperties = { margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 3 };
const liStyle: React.CSSProperties = { fontSize: 12, color: "var(--text-2)", lineHeight: 1.45 };

// ── Main board ──────────────────────────────────────────────────────────────
export default function RoadmapBoard({ liveStats, generatedAt }: { liveStats: ThemeLiveStats[]; generatedAt: string }) {
  const statsById = new Map(liveStats.map(s => [s.themeId, s]));

  return (
    <div style={{ padding: "36px 40px 80px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-1)", margin: 0, letterSpacing: "-0.03em" }}>
            Rian Technology Roadmap
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", margin: "4px 0 0" }}>
            CTO Dashboard · Q3–Q4 2026 · organized by strategic theme
          </p>
        </div>
        <a href="/work" style={{ fontSize: 12, color: "var(--text-3)", textDecoration: "none", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px" }}>← Work board</a>
      </div>
      <p style={{ fontSize: 11, color: "var(--text-4)", margin: "0 0 24px" }}>
        Live — grounded against Asana on {new Date(generatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
      </p>

      {/* Executive summary */}
      <div style={{ ...CARD, marginBottom: 20, borderLeft: "3px solid var(--accent)" }}>
        <div style={{ ...LABEL, marginBottom: 8 }}>Executive Summary</div>
        <p style={{ fontSize: 13.5, color: "var(--text-1)", lineHeight: 1.6, margin: "0 0 10px" }}>
          Rian is focused on two business-critical outcomes that drive customer validation, revenue acquisition, and platform scalability:
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 240, background: "color-mix(in srgb, var(--warn) 8%, transparent)", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>🚀 Self-Serve Launch</div>
            <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>Recipe Cloud · UX testing in progress</div>
          </div>
          <div style={{ flex: 1, minWidth: 240, background: "color-mix(in srgb, var(--warn) 8%, transparent)", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>🌐 Website Live Translation</div>
            <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>MVP demo · week of 23 Jun</div>
          </div>
        </div>
      </div>

      {/* Two-up: Health dashboard + Priorities */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, marginBottom: 20, alignItems: "start" }} className="roadmap-two-col">
        {/* Company health */}
        <div style={CARD}>
          <div style={{ ...LABEL, marginBottom: 14 }}>Company Health Dashboard</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {HEALTH_METRICS.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12.5, color: "var(--text-1)", flex: 1 }}>{m.label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLOR[m.status], whiteSpace: "nowrap" }}>
                  {STATUS_DOT[m.status]} {m.statusText}
                </span>
                <span style={{ fontSize: 10.5, color: "var(--text-4)", width: 100, textAlign: "right" }}>→ {m.target}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Strategic priorities */}
        <div style={CARD}>
          <div style={{ ...LABEL, marginBottom: 14 }}>Strategic Priority Order</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PRIORITIES.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  background: i < 2 ? "var(--warn)" : "var(--bg-subtle)",
                  color: i < 2 ? "#fff" : "var(--text-3)",
                  fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
                }}>{i + 1}</span>
                <span style={{ fontSize: 12.5, color: "var(--text-1)", fontWeight: i < 2 ? 600 : 400 }}>{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Themes */}
      <div style={{ ...LABEL, marginBottom: 12, fontSize: 11 }}>Strategic Themes — Now / Next / Later</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        {THEMES.map(theme => (
          <ThemeCard key={theme.id} theme={theme} stats={statsById.get(theme.id)} />
        ))}
      </div>

      {/* Timeline */}
      <div style={{ ...CARD, marginBottom: 20 }}>
        <div style={{ ...LABEL, marginBottom: 14 }}>Roadmap Timeline</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          {TIMELINE.map((t, i) => (
            <div key={i} style={{ borderLeft: "2px solid var(--border)", paddingLeft: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-1)", marginBottom: 8 }}>{t.month}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {t.items.map((it, j) => (
                  <div key={j} style={{ fontSize: 12, color: "var(--text-2)", display: "flex", gap: 7 }}>
                    <span>{it.emoji}</span>{it.label}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two-up: Risk register + R&D watchlist */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20, alignItems: "start" }} className="roadmap-two-col">
        <div style={CARD}>
          <div style={{ ...LABEL, marginBottom: 12 }}>Risk Register</div>
          {([["🔴 High", RISK_REGISTER.high, "var(--warn)"], ["🟡 Medium", RISK_REGISTER.medium, "var(--c-today)"], ["🟢 Low", RISK_REGISTER.low, "var(--c-fitness)"]] as const).map(([label, items, c], i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: c, marginBottom: 4 }}>{label}</div>
              <ul style={ulStyle}>{items.map((r, j) => <li key={j} style={liStyle}>{r}</li>)}</ul>
            </div>
          ))}
        </div>
        <div style={CARD}>
          <div style={{ ...LABEL, marginBottom: 12 }}>R&D Watchlist</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {RND_WATCHLIST.map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12.5, color: "var(--text-1)" }}>{r}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-4)", background: "var(--bg-subtle)", borderRadius: 20, padding: "2px 8px" }}>Research</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTO Commentary */}
      <div style={{ ...CARD, borderLeft: "3px solid var(--c-technical)", background: "color-mix(in srgb, var(--c-technical) 4%, var(--surface))" }}>
        <div style={{ ...LABEL, marginBottom: 10 }}>CTO Commentary</div>
        <p style={{ fontSize: 13, color: "var(--text-1)", lineHeight: 1.6, margin: "0 0 10px" }}>{CTO_COMMENTARY.intro}</p>
        <p style={{ fontSize: 12.5, color: "var(--text-2)", margin: "0 0 6px" }}>Success over the next 60 days depends on:</p>
        <ol style={{ margin: "0 0 14px", paddingLeft: 18 }}>
          {CTO_COMMENTARY.next60.map((n, i) => <li key={i} style={{ fontSize: 12.5, color: "var(--text-1)", lineHeight: 1.6 }}>{n}</li>)}
        </ol>
        <div style={{ fontSize: 13, fontStyle: "italic", color: "var(--c-technical)", fontWeight: 600, borderLeft: "2px solid var(--c-technical)", paddingLeft: 12, lineHeight: 1.5 }}>
          &ldquo;{CTO_COMMENTARY.mantra}&rdquo;
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .roadmap-two-col { grid-template-columns: 1fr !important; }
          .roadmap-phases { flex-direction: column !important; }
          .roadmap-detail-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
