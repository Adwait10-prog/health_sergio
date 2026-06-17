"use client";

import { useState } from "react";
import type { ThemeLiveStats, TriageTicket } from "@/app/work/roadmap/page";
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
const STATUS_LABEL: Record<ThemeStatus, string> = {
  critical: "Critical", active: "Active", planned: "Planned", upcoming: "Upcoming",
};
const ITEM_MARK: Record<ItemState, { mark: string; color: string }> = {
  done:        { mark: "✓", color: "var(--c-fitness)" },
  in_progress: { mark: "●", color: "var(--c-today)" },
  todo:        { mark: "○", color: "var(--text-4)" },
};

// ── Shared styles ─────────────────────────────────────────────────────────
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
const MONO: React.CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  fontFeatureSettings: '"tnum"',
};

// ── Status dot (drawn, not emoji — cleaner) ─────────────────────────────────
function Dot({ status, size = 8 }: { status: ThemeStatus; size?: number }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: "50%",
      background: STATUS_COLOR[status], display: "inline-block", flexShrink: 0,
    }} />
  );
}

// ── Now / Next / Later column ───────────────────────────────────────────────
function PhaseColumn({ title, items, accent }: { title: string; items: RoadmapItem[]; accent: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <span style={{ width: 14, height: 2, background: accent, borderRadius: 2 }} />
        <span style={{ ...LABEL, color: accent }}>{title}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((it, i) => {
          const m = ITEM_MARK[it.state];
          return (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ color: m.color, fontSize: 10, lineHeight: "18px", flexShrink: 0 }}>{m.mark}</span>
              <span style={{
                fontSize: 12.5, lineHeight: 1.45,
                color: it.state === "todo" ? "var(--text-3)" : "var(--text-1)",
                fontWeight: it.state === "in_progress" ? 600 : 400,
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
    <div style={{
      ...CARD, padding: 0, overflow: "hidden", transition: "border-color 0.2s",
      borderTopColor: open ? color : "var(--border)", borderRightColor: open ? color : "var(--border)",
      borderBottomColor: open ? color : "var(--border)", borderLeftColor: open ? color : "var(--border)",
    }}>
      {/* Accent rail + header */}
      <div style={{ display: "flex" }}>
        <div style={{ width: 4, background: color, flexShrink: 0 }} />
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            flex: 1, textAlign: "left", background: "transparent", border: "none",
            padding: "18px 20px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 9, minWidth: 0,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-4)", ...MONO }}>0{theme.id}</span>
              <span style={{ fontSize: 16 }}>{theme.emoji}</span>
              <span style={{ fontSize: 15.5, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.01em" }}>
                {theme.name}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color }}>
                <Dot status={theme.status} /> {STATUS_LABEL[theme.status]}
              </span>
              <span style={{ fontSize: 16, color: "var(--text-4)", transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s", lineHeight: 1 }}>›</span>
            </div>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0, lineHeight: 1.5 }}>{theme.objective}</p>
          {/* Live grounding chip row */}
          {stats && (completionPct != null || stats.inFlightTickets > 0) && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 1, alignItems: "center" }}>
              {completionPct != null && stats.totalTickets > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 64, height: 5, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
                    <div style={{ width: `${completionPct}%`, height: "100%", background: color, borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-3)", ...MONO }}>{completionPct}% · {stats.totalTickets} tickets</span>
                </div>
              )}
              {stats.inFlightTickets > 0 && (
                <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--c-today)", display: "flex", alignItems: "center", gap: 4, ...MONO }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--c-today)" }} /> {stats.inFlightTickets} in flight
                </span>
              )}
            </div>
          )}
        </button>
      </div>

      {/* Body */}
      {open && (
        <div style={{ padding: "4px 20px 20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ height: 1, background: "var(--border)" }} />
          {/* Now / Next / Later */}
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }} className="roadmap-phases">
            <PhaseColumn title="Now" items={theme.now} accent="var(--warn)" />
            <PhaseColumn title="Next" items={theme.next} accent="var(--c-technical)" />
            <PhaseColumn title="Later" items={theme.later} accent="var(--text-4)" />
          </div>

          {/* Live matched tickets */}
          {stats && stats.matchedTicketNames.length > 0 && (
            <div style={{ background: "var(--bg-subtle)", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ ...LABEL, marginBottom: 8 }}>Live Asana tickets grounding this theme</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {stats.matchedTicketNames.map((n, i) => (
                  <div key={i} style={{ fontSize: 12, color: "var(--text-2)", display: "flex", gap: 8, alignItems: "baseline" }}>
                    <span style={{ color: "var(--c-today)", fontSize: 9 }}>●</span>{n}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Why / Metrics grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="roadmap-detail-grid">
            <div>
              <div style={{ ...LABEL, marginBottom: 8 }}>Why it matters</div>
              <ul style={ulStyle}>{theme.whyItMatters.map((w, i) => <li key={i} style={liStyle}>{w}</li>)}</ul>
            </div>
            <div>
              <div style={{ ...LABEL, marginBottom: 8 }}>Success metrics</div>
              <ul style={ulStyle}>{theme.successMetrics.map((m, i) => <li key={i} style={liStyle}>{m}</li>)}</ul>
            </div>
          </div>

          {/* Risks + owner */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap", paddingTop: 4 }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ ...LABEL, marginBottom: 8, color: "var(--warn)" }}>Risks</div>
              <ul style={ulStyle}>{theme.risks.map((r, i) => <li key={i} style={{ ...liStyle, color: "var(--text-2)" }}>{r}</li>)}</ul>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ ...LABEL, marginBottom: 4 }}>Owner</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-1)" }}>{theme.owner}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ulStyle: React.CSSProperties = { margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 };
const liStyle: React.CSSProperties = { fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.45 };

// ── Main board ──────────────────────────────────────────────────────────────
export default function RoadmapBoard({
  liveStats, triage, triageTotal, generatedAt,
}: {
  liveStats: ThemeLiveStats[];
  triage: TriageTicket[];
  triageTotal: number;
  generatedAt: string;
}) {
  const statsById = new Map(liveStats.map(s => [s.themeId, s]));

  return (
    <div style={{ padding: "40px 44px 96px", maxWidth: 1120, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ ...LABEL, color: "var(--c-technical)", marginBottom: 6 }}>CTO Dashboard · Q3–Q4 2026</div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: "var(--text-1)", margin: 0, letterSpacing: "-0.035em" }}>
            Rian Technology Roadmap
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="/work/analysis" style={navBtn}>Media analysis →</a>
          <a href="/work" style={navBtn}>← Work board</a>
        </div>
      </div>
      <p style={{ fontSize: 11, color: "var(--text-4)", margin: "8px 0 28px", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--c-fitness)" }} />
        Live · grounded against Asana on {new Date(generatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
      </p>

      {/* Executive summary */}
      <div style={{ ...CARD, marginBottom: 24, borderTopWidth: 3, borderTopColor: "var(--accent)" }}>
        <div style={{ ...LABEL, marginBottom: 10 }}>Executive Summary</div>
        <p style={{ fontSize: 14, color: "var(--text-1)", lineHeight: 1.6, margin: "0 0 14px", maxWidth: 760 }}>
          Rian is focused on two business-critical outcomes that drive customer validation, revenue acquisition, and platform scalability:
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { icon: "🚀", t: "Self-Serve Launch", s: "Recipe Cloud · UX testing in progress" },
            { icon: "🌐", t: "Website Live Translation", s: "MVP demo · week of 23 Jun" },
          ].map((x, i) => (
            <div key={i} style={{
              flex: 1, minWidth: 250, borderRadius: 10, padding: "14px 16px",
              border: "1px solid color-mix(in srgb, var(--warn) 30%, var(--border))",
              background: "color-mix(in srgb, var(--warn) 6%, transparent)",
            }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-1)" }}>{x.icon} {x.t}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 3 }}>{x.s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Two-up: Health dashboard + Priorities */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, marginBottom: 24, alignItems: "start" }} className="roadmap-two-col">
        <div style={CARD}>
          <div style={{ ...LABEL, marginBottom: 16 }}>Company Health</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {HEALTH_METRICS.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12.5, color: "var(--text-1)", flex: 1 }}>{m.label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLOR[m.status], whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                  <Dot status={m.status} size={7} /> {m.statusText}
                </span>
                <span style={{ fontSize: 10.5, color: "var(--text-4)", width: 104, textAlign: "right", ...MONO }}>→ {m.target}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={CARD}>
          <div style={{ ...LABEL, marginBottom: 16 }}>Priority Order</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {PRIORITIES.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  width: 21, height: 21, borderRadius: 7, flexShrink: 0,
                  background: i < 2 ? "var(--warn)" : "var(--bg-subtle)",
                  color: i < 2 ? "#fff" : "var(--text-3)",
                  fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", ...MONO,
                }}>{i + 1}</span>
                <span style={{ fontSize: 12.5, color: "var(--text-1)", fontWeight: i < 2 ? 600 : 400 }}>{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Themes */}
      <div style={{ ...LABEL, marginBottom: 14 }}>Strategic Themes — Now / Next / Later</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
        {THEMES.map(theme => (
          <ThemeCard key={theme.id} theme={theme} stats={statsById.get(theme.id)} />
        ))}
      </div>

      {/* Needs triage — auto-surfaced new tickets */}
      {triage.length > 0 && (
        <div style={{ ...CARD, marginBottom: 24, borderTopWidth: 3, borderTopColor: "var(--c-today)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ ...LABEL }}>Needs Triage — unmapped tickets</div>
            <span style={{ fontSize: 11, color: "var(--text-4)", ...MONO }}>{triageTotal} total · showing {triage.length}</span>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-3)", margin: "0 0 14px", maxWidth: 720, lineHeight: 1.5 }}>
            Incomplete tickets across all projects that don&rsquo;t yet map to a strategic theme. Review and fold the relevant ones into a theme&rsquo;s Now/Next/Later.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {triage.map((t, i) => (
              <a key={i} href={t.permalink ?? "#"} target="_blank" rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", gap: 10, textDecoration: "none",
                  padding: "8px 10px", borderRadius: 8, background: i % 2 ? "transparent" : "var(--bg-subtle)",
                }}>
                <span style={{ fontSize: 12.5, color: "var(--text-1)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--c-technical)", background: "color-mix(in srgb, var(--c-technical) 10%, transparent)", borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap" }}>{t.project}</span>
                {t.sectionName && <span style={{ fontSize: 10, color: "var(--text-4)", whiteSpace: "nowrap" }}>{t.sectionName}</span>}
                {t.assigneeName && <span style={{ fontSize: 10.5, color: "var(--text-3)", width: 90, textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.assigneeName}</span>}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div style={{ ...CARD, marginBottom: 24 }}>
        <div style={{ ...LABEL, marginBottom: 16 }}>Roadmap Timeline</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16 }}>
          {TIMELINE.map((t, i) => (
            <div key={i} style={{ borderLeft: "2px solid var(--border)", paddingLeft: 14 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-1)", marginBottom: 10 }}>{t.month}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {t.items.map((it, j) => (
                  <div key={j} style={{ fontSize: 12, color: "var(--text-2)", display: "flex", gap: 8 }}>
                    <span>{it.emoji}</span>{it.label}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two-up: Risk register + R&D watchlist */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24, alignItems: "start" }} className="roadmap-two-col">
        <div style={CARD}>
          <div style={{ ...LABEL, marginBottom: 14 }}>Risk Register</div>
          {([["High", RISK_REGISTER.high, "var(--warn)"], ["Medium", RISK_REGISTER.medium, "var(--c-today)"], ["Low", RISK_REGISTER.low, "var(--c-fitness)"]] as const).map(([label, items, c], i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: c, marginBottom: 5, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: c }} /> {label}
              </div>
              <ul style={ulStyle}>{items.map((r, j) => <li key={j} style={liStyle}>{r}</li>)}</ul>
            </div>
          ))}
        </div>
        <div style={CARD}>
          <div style={{ ...LABEL, marginBottom: 14 }}>R&D Watchlist</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {RND_WATCHLIST.map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12.5, color: "var(--text-1)" }}>{r}</span>
                <span style={{ fontSize: 9.5, fontWeight: 600, color: "var(--text-4)", background: "var(--bg-subtle)", borderRadius: 20, padding: "2px 9px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Research</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTO Commentary */}
      <div style={{ ...CARD, borderTopWidth: 3, borderTopColor: "var(--c-technical)" }}>
        <div style={{ ...LABEL, marginBottom: 12 }}>CTO Commentary</div>
        <p style={{ fontSize: 13.5, color: "var(--text-1)", lineHeight: 1.6, margin: "0 0 12px" }}>{CTO_COMMENTARY.intro}</p>
        <p style={{ fontSize: 12.5, color: "var(--text-2)", margin: "0 0 6px" }}>Success over the next 60 days depends on:</p>
        <ol style={{ margin: "0 0 18px", paddingLeft: 18 }}>
          {CTO_COMMENTARY.next60.map((n, i) => <li key={i} style={{ fontSize: 12.5, color: "var(--text-1)", lineHeight: 1.7 }}>{n}</li>)}
        </ol>
        <div style={{ fontSize: 13.5, fontStyle: "italic", color: "var(--c-technical)", fontWeight: 600, borderLeft: "3px solid var(--c-technical)", paddingLeft: 14, lineHeight: 1.55 }}>
          &ldquo;{CTO_COMMENTARY.mantra}&rdquo;
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .roadmap-two-col { grid-template-columns: 1fr !important; }
          .roadmap-phases { flex-direction: column !important; gap: 16px !important; }
          .roadmap-detail-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  fontSize: 12, color: "var(--text-3)", textDecoration: "none",
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 8, padding: "8px 12px", whiteSpace: "nowrap",
};
