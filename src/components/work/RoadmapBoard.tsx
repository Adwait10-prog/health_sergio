"use client";

import { useState } from "react";
import type { ThemeLiveStats, TriageTicket, WeekTicket } from "@/app/work/roadmap/page";
import {
  THEMES, HEALTH_METRICS, PRIORITIES, RISK_REGISTER, CTO_COMMENTARY,
  RND_THESIS, RND_TRACKS, RND_STAGE_ORDER, RND_STAGE_LABEL,
  type RoadmapTheme, type RoadmapItem, type ThemeStatus, type ItemState, type RndStage,
} from "@/lib/roadmapData";

// ── Status → color ──────────────────────────────────────────────────────────
const STATUS_COLOR: Record<ThemeStatus, string> = {
  critical: "var(--warn)", active: "var(--c-today)", planned: "var(--c-fitness)", upcoming: "var(--text-4)",
};
const STATUS_LABEL: Record<ThemeStatus, string> = {
  critical: "Critical", active: "Active", planned: "Planned", upcoming: "Upcoming",
};
const ITEM_MARK: Record<ItemState, { mark: string; color: string }> = {
  done: { mark: "✓", color: "var(--c-fitness)" },
  in_progress: { mark: "●", color: "var(--c-today)" },
  todo: { mark: "○", color: "var(--text-4)" },
};
const STAGE_COLOR: Record<RndStage, string> = {
  exploring: "var(--text-4)", validating: "var(--c-today)", productizing: "var(--c-technical)", graduated: "var(--c-fitness)",
};

// ── Shared styles ─────────────────────────────────────────────────────────
const CARD: React.CSSProperties = {
  background: "var(--surface)",
  borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderLeftWidth: 1,
  borderStyle: "solid",
  borderTopColor: "var(--border)", borderRightColor: "var(--border)",
  borderBottomColor: "var(--border)", borderLeftColor: "var(--border)",
  borderRadius: 14, padding: 20, boxShadow: "var(--shadow)",
};
const LABEL: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 700, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.08em",
};
const MONO: React.CSSProperties = { fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum"' };

function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return <span style={{ width: size, height: size, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />;
}

function TrendCaret({ trend }: { trend: ThemeLiveStats["trend"] }) {
  if (trend === "new") return null;
  const map = { up: { c: "var(--c-fitness)", s: "▲" }, down: { c: "var(--warn)", s: "▼" }, flat: { c: "var(--text-4)", s: "▬" } };
  const { c, s } = map[trend];
  return <span style={{ fontSize: 9, color: c }}>{s}</span>;
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
              <span style={{ fontSize: 12.5, lineHeight: 1.45, color: it.state === "todo" ? "var(--text-3)" : "var(--text-1)", fontWeight: it.state === "in_progress" ? 600 : 400 }}>{it.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Live progress chip (with trend) ─────────────────────────────────────────
function ProgressChip({ stats, color }: { stats?: ThemeLiveStats; color: string }) {
  if (!stats || stats.totalTickets === 0) return null;
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 64, height: 5, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
          <div style={{ width: `${stats.completedPct}%`, height: "100%", background: color, borderRadius: 3 }} />
        </div>
        <span style={{ fontSize: 11, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 4, ...MONO }}>
          {stats.completedPct}% <TrendCaret trend={stats.trend} /> · {stats.totalTickets} tickets
        </span>
      </div>
      {stats.inFlightTickets > 0 && (
        <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--c-today)", display: "flex", alignItems: "center", gap: 4, ...MONO }}>
          <Dot color="var(--c-today)" size={5} /> {stats.inFlightTickets} in flight
        </span>
      )}
    </div>
  );
}

const ulStyle: React.CSSProperties = { margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 };
const liStyle: React.CSSProperties = { fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.45 };

// ── Full theme card (focus tier — expanded by default) ──────────────────────
function FocusCard({ theme, stats, defaultOpen }: { theme: RoadmapTheme; stats?: ThemeLiveStats; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const color = STATUS_COLOR[theme.status];
  return (
    <div style={{ ...CARD, padding: 0, overflow: "hidden", borderTopColor: open ? color : "var(--border)", borderTopWidth: open ? 3 : 1 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "18px 20px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 9 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <span style={{ fontSize: 18 }}>{theme.emoji}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.01em" }}>{theme.name}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color }}><Dot color={color} /> {STATUS_LABEL[theme.status]}</span>
            <span style={{ fontSize: 16, color: "var(--text-4)", transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</span>
          </div>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0, lineHeight: 1.5 }}>{theme.objective}</p>
        <ProgressChip stats={stats} color={color} />
      </button>
      {open && <FocusBody theme={theme} stats={stats} />}
    </div>
  );
}

function FocusBody({ theme, stats }: { theme: RoadmapTheme; stats?: ThemeLiveStats }) {
  return (
    <div style={{ padding: "4px 20px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ height: 1, background: "var(--border)" }} />
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }} className="roadmap-phases">
        <PhaseColumn title="Now" items={theme.now} accent="var(--warn)" />
        <PhaseColumn title="Next" items={theme.next} accent="var(--c-technical)" />
        <PhaseColumn title="Later" items={theme.later} accent="var(--text-4)" />
      </div>
      {stats && stats.matchedTicketNames.length > 0 && (
        <div style={{ background: "var(--bg-subtle)", borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ ...LABEL, marginBottom: 8 }}>Live Asana tickets grounding this theme</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {stats.matchedTicketNames.map((n, i) => (
              <div key={i} style={{ fontSize: 12, color: "var(--text-2)", display: "flex", gap: 8, alignItems: "baseline" }}><span style={{ color: "var(--c-today)", fontSize: 9 }}>●</span>{n}</div>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="roadmap-detail-grid">
        <div><div style={{ ...LABEL, marginBottom: 8 }}>Why it matters</div><ul style={ulStyle}>{theme.whyItMatters.map((w, i) => <li key={i} style={liStyle}>{w}</li>)}</ul></div>
        <div><div style={{ ...LABEL, marginBottom: 8 }}>Success metrics</div><ul style={ulStyle}>{theme.successMetrics.map((m, i) => <li key={i} style={liStyle}>{m}</li>)}</ul></div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap", paddingTop: 4 }}>
        <div style={{ flex: 1, minWidth: 220 }}><div style={{ ...LABEL, marginBottom: 8, color: "var(--warn)" }}>Risks</div><ul style={ulStyle}>{theme.risks.map((r, i) => <li key={i} style={{ ...liStyle, color: "var(--text-2)" }}>{r}</li>)}</ul></div>
        <div style={{ textAlign: "right" }}><div style={{ ...LABEL, marginBottom: 4 }}>Owner</div><div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-1)" }}>{theme.owner}</div></div>
      </div>
    </div>
  );
}

// ── Compact theme card (supporting tier — collapsed by default) ─────────────
function CompactCard({ theme, stats }: { theme: RoadmapTheme; stats?: ThemeLiveStats }) {
  const [open, setOpen] = useState(false);
  const color = STATUS_COLOR[theme.status];
  return (
    <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "14px 16px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span style={{ fontSize: 14 }}>{theme.emoji}</span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{theme.name}</span>
          </div>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 600, color, flexShrink: 0 }}><Dot color={color} size={6} /> {STATUS_LABEL[theme.status]}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          {stats && stats.totalTickets > 0 ? (
            <span style={{ fontSize: 10.5, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 4, ...MONO }}>{stats.completedPct}% <TrendCaret trend={stats.trend} /> · {stats.totalTickets}</span>
          ) : <span />}
          <span style={{ fontSize: 10, color: "var(--text-4)" }}>{theme.owner}</span>
        </div>
      </button>
      {open && <FocusBody theme={theme} stats={stats} />}
    </div>
  );
}

// ── Main board ──────────────────────────────────────────────────────────────
export default function RoadmapBoard({
  liveStats, triage, triageTotal, weekTickets, weekTotal, generatedAt,
}: {
  liveStats: ThemeLiveStats[]; triage: TriageTicket[]; triageTotal: number;
  weekTickets: WeekTicket[]; weekTotal: number; generatedAt: string;
}) {
  const statsById = new Map(liveStats.map(s => [s.themeId, s]));
  const [triageOpen, setTriageOpen] = useState(false);

  const focus = THEMES.filter(t => t.tier === "focus");
  const supporting = THEMES.filter(t => t.tier === "supporting");

  return (
    <div style={{ padding: "40px 44px 96px", maxWidth: 1120, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ ...LABEL, color: "var(--c-technical)", marginBottom: 6 }}>CTO Dashboard · Q3–Q4 2026</div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: "var(--text-1)", margin: 0, letterSpacing: "-0.035em" }}>Rian Technology Roadmap</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="/work/analysis" style={navBtn}>Media analysis →</a>
          <a href="/work" style={navBtn}>← Work board</a>
        </div>
      </div>
      <p style={{ fontSize: 11, color: "var(--text-4)", margin: "8px 0 28px", display: "flex", alignItems: "center", gap: 6 }}>
        <Dot color="var(--c-fitness)" size={6} /> Live · grounded against Asana on {new Date(generatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
      </p>

      {/* Executive summary */}
      <div style={{ ...CARD, marginBottom: 24, borderTopWidth: 3, borderTopColor: "var(--accent)" }}>
        <div style={{ ...LABEL, marginBottom: 10 }}>Executive Summary</div>
        <p style={{ fontSize: 14, color: "var(--text-1)", lineHeight: 1.6, margin: "0 0 14px", maxWidth: 760 }}>
          Rian is focused on two business-critical outcomes that drive customer validation, revenue acquisition, and platform scalability:
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[{ icon: "🚀", t: "Self-Serve Launch", s: "Recipe Cloud · UX testing in progress" }, { icon: "🌐", t: "Website Live Translation", s: "MVP demo · week of 23 Jun" }].map((x, i) => (
            <div key={i} style={{ flex: 1, minWidth: 250, borderRadius: 10, padding: "14px 16px", border: "1px solid color-mix(in srgb, var(--warn) 30%, var(--border))", background: "color-mix(in srgb, var(--warn) 6%, transparent)" }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-1)" }}>{x.icon} {x.t}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 3 }}>{x.s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Priority Order (moved up — orientation device) */}
      <div style={{ ...CARD, marginBottom: 20 }}>
        <div style={{ ...LABEL, marginBottom: 14 }}>Priority Order</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 8 }}>
          {PRIORITIES.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 21, height: 21, borderRadius: 7, flexShrink: 0, background: i < 2 ? "var(--warn)" : "var(--bg-subtle)", color: i < 2 ? "#fff" : "var(--text-3)", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", ...MONO }}>{i + 1}</span>
              <span style={{ fontSize: 12.5, color: "var(--text-1)", fontWeight: i < 2 ? 600 : 400 }}>{p}</span>
            </div>
          ))}
        </div>
      </div>

      {/* This Week strip */}
      <div style={{ ...CARD, marginBottom: 20, padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ ...LABEL, color: "var(--warn)" }}>This Week</span>
          {weekTickets.length === 0 ? (
            <span style={{ fontSize: 12, color: "var(--text-4)" }}>Nothing due in the next 7 days.</span>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1 }}>
              {weekTickets.map((t, i) => (
                <a key={i} href={t.permalink ?? "#"} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 7, textDecoration: "none", fontSize: 11.5, padding: "5px 10px", borderRadius: 20, background: "var(--bg-subtle)", color: "var(--text-1)", maxWidth: 280 }}>
                  <Dot color={t.overdue ? "var(--warn)" : "var(--c-today)"} size={6} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: t.overdue ? "var(--warn)" : "var(--text-4)", ...MONO }}>{t.overdue ? "overdue" : t.dueOn.slice(5)}</span>
                </a>
              ))}
              {weekTotal > weekTickets.length && <span style={{ fontSize: 11, color: "var(--text-4)", alignSelf: "center" }}>+{weekTotal - weekTickets.length} more</span>}
            </div>
          )}
        </div>
      </div>

      {/* Company Health */}
      <div style={{ ...CARD, marginBottom: 28 }}>
        <div style={{ ...LABEL, marginBottom: 16 }}>Company Health</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "10px 28px" }}>
          {HEALTH_METRICS.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12.5, color: "var(--text-1)", flex: 1 }}>{m.label}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLOR[m.status], whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}><Dot color={STATUS_COLOR[m.status]} size={7} /> {m.statusText}</span>
              <span style={{ fontSize: 10.5, color: "var(--text-4)", width: 110, textAlign: "right", ...MONO }}>→ {m.target}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Focus Products */}
      <div style={{ ...LABEL, marginBottom: 14, fontSize: 12, color: "var(--text-2)" }}>● Focus Products</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
        {focus.map(theme => <FocusCard key={theme.id} theme={theme} stats={statsById.get(theme.id)} defaultOpen />)}
      </div>

      {/* Supporting Themes */}
      <div style={{ ...LABEL, marginBottom: 14, fontSize: 12, color: "var(--text-2)" }}>○ Supporting Themes</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginBottom: 28 }}>
        {supporting.map(theme => <CompactCard key={theme.id} theme={theme} stats={statsById.get(theme.id)} />)}
      </div>

      {/* R&D Pillar — stage axis */}
      <div style={{ ...CARD, marginBottom: 28, borderTopWidth: 3, borderTopColor: "var(--c-technical)" }}>
        <div style={{ ...LABEL, marginBottom: 8 }}>R&D Pillar — Voice & Audio Pipeline</div>
        <p style={{ fontSize: 13, color: "var(--text-1)", lineHeight: 1.6, margin: "0 0 18px", maxWidth: 820, fontWeight: 500 }}>{RND_THESIS}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
          {RND_STAGE_ORDER.map(stage => {
            const tracks = RND_TRACKS.filter(t => t.stage === stage);
            const c = STAGE_COLOR[stage];
            return (
              <div key={stage} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: 6, borderBottom: `2px solid ${c}` }}>
                  <Dot color={c} size={7} /><span style={{ ...LABEL, color: c }}>{RND_STAGE_LABEL[stage]}</span>
                  <span style={{ fontSize: 10, color: "var(--text-4)", marginLeft: "auto", ...MONO }}>{tracks.length}</span>
                </div>
                {tracks.map((t, i) => (
                  <div key={i} style={{ background: "var(--bg-subtle)", borderRadius: 9, padding: "10px 12px" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-1)", marginBottom: 4 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.45, marginBottom: 4 }}>{t.what}</div>
                    <div style={{ fontSize: 10.5, color: "var(--text-4)", lineHeight: 1.4, fontStyle: "italic" }}>{t.why}</div>
                  </div>
                ))}
                {tracks.length === 0 && <span style={{ fontSize: 11, color: "var(--text-4)" }}>—</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* In Motion Now — grouped by theme, NOW items only */}
      <div style={{ ...CARD, marginBottom: 24 }}>
        <div style={{ ...LABEL, marginBottom: 4 }}>In Motion Now</div>
        <p style={{ fontSize: 11.5, color: "var(--text-4)", margin: "0 0 18px" }}>What&rsquo;s actively in progress across every theme. (Next &amp; Later live in each theme card.)</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "18px 28px" }}>
          {THEMES.map(theme => {
            const nowItems = theme.now;
            if (nowItems.length === 0) return null;
            const c = STATUS_COLOR[theme.status];
            return (
              <div key={theme.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
                  <span style={{ fontSize: 13 }}>{theme.emoji}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-1)" }}>{theme.name}</span>
                  <Dot color={c} size={6} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, paddingLeft: 2 }}>
                  {nowItems.map((it, i) => {
                    const m = ITEM_MARK[it.state];
                    return (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <span style={{ color: m.color, fontSize: 10, lineHeight: "17px", flexShrink: 0 }}>{m.mark}</span>
                        <span style={{ fontSize: 12, lineHeight: 1.4, color: it.state === "todo" ? "var(--text-3)" : "var(--text-1)", fontWeight: it.state === "in_progress" ? 600 : 400 }}>{it.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Needs Triage — collapsed by default */}
      {triageTotal > 0 && (
        <div style={{ ...CARD, marginBottom: 24, padding: 0, overflow: "hidden" }}>
          <button onClick={() => setTriageOpen(o => !o)} style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "16px 20px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ ...LABEL }}>Needs Triage <span style={{ color: "var(--c-today)" }}>({triageTotal})</span></span>
            <span style={{ fontSize: 16, color: "var(--text-4)", transform: triageOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</span>
          </button>
          {triageOpen && (
            <div style={{ padding: "0 20px 18px" }}>
              <p style={{ fontSize: 12, color: "var(--text-3)", margin: "0 0 14px", maxWidth: 720, lineHeight: 1.5 }}>Incomplete tickets that don&rsquo;t yet map to a theme. Showing {triage.length} of {triageTotal}.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {triage.map((t, i) => (
                  <a key={i} href={t.permalink ?? "#"} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", padding: "8px 10px", borderRadius: 8, background: i % 2 ? "transparent" : "var(--bg-subtle)" }}>
                    <span style={{ fontSize: 12.5, color: "var(--text-1)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "var(--c-technical)", background: "color-mix(in srgb, var(--c-technical) 10%, transparent)", borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap" }}>{t.project}</span>
                    {t.assigneeName && <span style={{ fontSize: 10.5, color: "var(--text-3)", width: 90, textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.assigneeName}</span>}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Risk Register */}
      <div style={{ ...CARD, marginBottom: 24 }}>
        <div style={{ ...LABEL, marginBottom: 14 }}>Risk Register</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
          {([["High", RISK_REGISTER.high, "var(--warn)"], ["Medium", RISK_REGISTER.medium, "var(--c-today)"], ["Low", RISK_REGISTER.low, "var(--c-fitness)"]] as const).map(([label, items, c], i) => (
            <div key={i}>
              <div style={{ fontSize: 11, fontWeight: 700, color: c, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}><Dot color={c} size={7} /> {label}</div>
              <ul style={ulStyle}>{items.map((r, j) => <li key={j} style={liStyle}>{r}</li>)}</ul>
            </div>
          ))}
        </div>
      </div>

      {/* CTO Commentary */}
      <div style={{ ...CARD, borderTopWidth: 3, borderTopColor: "var(--c-technical)" }}>
        <div style={{ ...LABEL, marginBottom: 12 }}>CTO Commentary</div>
        <p style={{ fontSize: 13.5, color: "var(--text-1)", lineHeight: 1.6, margin: "0 0 12px" }}>{CTO_COMMENTARY.intro}</p>
        <p style={{ fontSize: 12.5, color: "var(--text-2)", margin: "0 0 6px" }}>Success over the next 60 days depends on:</p>
        <ol style={{ margin: "0 0 18px", paddingLeft: 18 }}>{CTO_COMMENTARY.next60.map((n, i) => <li key={i} style={{ fontSize: 12.5, color: "var(--text-1)", lineHeight: 1.7 }}>{n}</li>)}</ol>
        <div style={{ fontSize: 13.5, fontStyle: "italic", color: "var(--c-technical)", fontWeight: 600, borderLeft: "3px solid var(--c-technical)", paddingLeft: 14, lineHeight: 1.55 }}>&ldquo;{CTO_COMMENTARY.mantra}&rdquo;</div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .roadmap-phases { grid-template-columns: 1fr !important; flex-direction: column !important; gap: 16px !important; }
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
