"use client";

import { useState } from "react";
import type { ThemeLiveStats, TriageTicket, WeekTicket } from "@/app/work/roadmap/page";
import {
  THEMES, HEALTH_METRICS, PRIORITIES, RISK_REGISTER, CTO_COMMENTARY,
  RND_THESIS, RND_TRACKS, RND_STAGE_ORDER, RND_STAGE_LABEL,
  type RoadmapTheme, type ThemeStatus, type ItemState, type RndStage,
} from "@/lib/roadmapData";
import { DASHBOARD_TOKENS, MONO, tnum, softFill } from "./dashboardTokens";
import CeoUpdateButton from "./CeoUpdateButton";

// ── status / stage → color ──────────────────────────────────────────────────
const STATUS_COLOR: Record<ThemeStatus, string> = {
  critical: "var(--amber)", active: "var(--green)", planned: "var(--blue)", upcoming: "var(--t4)",
};
const STATUS_LABEL: Record<ThemeStatus, string> = {
  critical: "Critical", active: "Active", planned: "Planned", upcoming: "Upcoming",
};
const ITEM_MARK: Record<ItemState, { mark: string; color: string }> = {
  done: { mark: "✓", color: "var(--green)" },
  in_progress: { mark: "●", color: "var(--accent)" },
  todo: { mark: "○", color: "var(--t4)" },
};
const STAGE_COLOR: Record<RndStage, string> = {
  exploring: "var(--t4)", validating: "var(--blue)", productizing: "var(--accent)", graduated: "var(--green)",
};

// ── shared bits ─────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
  padding: 22, boxShadow: "var(--shadow-sm)",
};
const eyebrow: React.CSSProperties = {
  fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: ".12em",
  textTransform: "uppercase", color: "var(--t4)",
};
const navPill: React.CSSProperties = {
  fontSize: 12.5, color: "var(--t2)", textDecoration: "none", background: "var(--surface)",
  border: "1px solid var(--border)", borderRadius: 9, padding: "9px 14px", fontWeight: 500,
  boxShadow: "var(--shadow-sm)", whiteSpace: "nowrap",
};

function Dot({ color, size = 7 }: { color: string; size?: number }) {
  return <span style={{ width: size, height: size, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block" }} />;
}

function StatusPill({ status }: { status: ThemeStatus }) {
  const c = STATUS_COLOR[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: c, background: softFill(c), padding: "4px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>
      <Dot color={c} size={6} /> {STATUS_LABEL[status]}
    </span>
  );
}

export default function RoadmapBoard({
  liveStats, triage, triageTotal, weekTickets, weekTotal, generatedAt,
}: {
  liveStats: ThemeLiveStats[]; triage: TriageTicket[]; triageTotal: number;
  weekTickets: WeekTicket[]; weekTotal: number; generatedAt: string;
}) {
  const statsById = new Map(liveStats.map(s => [s.themeId, s]));
  const [triageOpen, setTriageOpen] = useState(false);

  const flagship = THEMES.find(t => t.name.includes("Rian Recipe"));
  const bets = THEMES.filter(t => t.tier === "focus" && t.status === "critical");

  // KPI strip from real data
  const totalTickets = liveStats.reduce((s, x) => s + x.totalTickets, 0);
  const inFlight = liveStats.reduce((s, x) => s + x.inFlightTickets, 0);
  const withTickets = liveStats.filter(x => x.totalTickets > 0);
  const portfolioPct = withTickets.length
    ? Math.round(withTickets.reduce((s, x) => s + x.completedPct, 0) / withTickets.length)
    : 0;
  const overdue = weekTickets.filter(w => w.overdue).length;
  const highRisks = RISK_REGISTER.high.length;

  const kpis = [
    { value: `${portfolioPct}%`, label: "Portfolio Progress", sub: `avg · ${THEMES.length} themes`, bar: "var(--accent)" },
    { value: String(totalTickets), label: "Tracked Tickets", sub: "live from Asana", bar: "var(--t3)" },
    { value: String(inFlight), label: "In Flight", sub: "matched to themes", bar: "var(--blue)" },
    { value: String(weekTotal), label: "Due This Week", sub: `${overdue} overdue`, bar: "var(--amber)" },
    { value: "92%", label: "Self-Serve Readiness", sub: "UX testing", bar: "var(--green)" },
    { value: String(highRisks), label: "High Risks", sub: "launch · demo scope", bar: "var(--amber)" },
  ];

  return (
    <div style={{ ...DASHBOARD_TOKENS, padding: "32px 40px 80px" }}>
      <div style={{ maxWidth: 1360, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ ...eyebrow, letterSpacing: ".16em", color: "var(--accent)", marginBottom: 11 }}>CTO Dashboard · Q3–Q4 2026</div>
            <h1 style={{ fontSize: 33, fontWeight: 700, letterSpacing: "-.025em", margin: 0, lineHeight: 1.04 }}>Rian Technology Roadmap</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 13, fontSize: 12.5, color: "var(--t3)" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 0 3px var(--green-soft)" }} />
              Live · grounded against Asana · {new Date(generatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <CeoUpdateButton />
            <a href="/work/analysis" style={navPill}>Media analysis →</a>
            <a href="/work" style={navPill}>← Work board</a>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0,1fr))", gap: 12 }} className="rm-kpi">
          {kpis.map((k, i) => (
            <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 13, padding: "17px 17px 15px", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ fontSize: 27, fontWeight: 700, letterSpacing: "-.02em", lineHeight: 1, ...tnum }}>{k.value}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 11 }}>
                <Dot color={k.bar} size={6} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--t2)" }}>{k.label}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--t4)", marginTop: 3, paddingLeft: 13 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Strategic Bets */}
        {bets.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 13, marginTop: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={eyebrow}>Strategic Bets · Next 60 Days</span>
              <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="rm-2col">
              {bets.map((b, i) => {
                const st = statsById.get(b.id);
                const c = STATUS_COLOR[b.status];
                return (
                  <div key={b.id} style={{ ...card, display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: "var(--t3)", background: "var(--surface-2)", borderRadius: 6, padding: "3px 7px", flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                        <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-.01em" }}>{b.name}</span>
                      </div>
                      <StatusPill status={b.status} />
                    </div>
                    <p style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.55, margin: 0 }}>{b.objective}</p>
                    {st && st.totalTickets > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 4, background: "var(--surface-2)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${st.completedPct}%`, background: c, borderRadius: 4 }} />
                        </div>
                        <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--t3)", whiteSpace: "nowrap" }}>{st.completedPct}% · {st.totalTickets} tickets</span>
                      </div>
                    )}
                    <div>
                      <div style={{ ...eyebrow, fontSize: 10 }}>In Motion Now</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 9 }}>
                        {b.now.map((n, j) => (
                          <div key={j} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                            <span style={{ display: "flex", alignItems: "center", height: 18, flexShrink: 0 }}><Dot color={c} size={5} /></span>
                            <span style={{ fontSize: 12.5, color: "var(--t1)", lineHeight: "18px" }}>{n.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginTop: "auto", paddingTop: 14, borderTop: "1px solid var(--border-soft)", display: "flex", flexDirection: "column", gap: 9 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
                        <span style={{ ...eyebrow, fontSize: 10, flexShrink: 0 }}>Target</span>
                        <span style={{ fontSize: 12, color: "var(--t2)" }}>{b.successMetrics[0]}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--t1)" }}>{b.owner}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Main grid */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.72fr) minmax(0,1fr)", gap: 20, alignItems: "start" }} className="rm-main">

          {/* ── Left column ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>

            {/* Flagship STS */}
            {flagship && <FlagshipCard theme={flagship} stats={statsById.get(flagship.id)} />}

            {/* Product Portfolio */}
            <div style={card}>
              <div style={eyebrow}>Product Portfolio</div>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.7fr) 130px 58px 96px", gap: 14, alignItems: "center", padding: "13px 0 9px", fontFamily: MONO, fontSize: 9.5, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--t4)" }} className="rm-portfolio-head">
                <span>Theme</span><span>Progress</span><span style={{ textAlign: "right" }}>Tickets</span><span>Status</span>
              </div>
              {THEMES.map(t => {
                const st = statsById.get(t.id);
                const c = STATUS_COLOR[t.status];
                const pct = st?.completedPct ?? 0;
                return (
                  <div key={t.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1.7fr) 130px 58px 96px", gap: 14, alignItems: "center", padding: "11px 0", borderTop: "1px solid var(--border-soft)" }} className="rm-portfolio-row">
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <Dot color={c} size={8} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 5, borderRadius: 3, background: "var(--surface-2)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: c, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--t3)", width: 30, textAlign: "right" }}>{pct}%</span>
                    </div>
                    <span style={{ fontFamily: MONO, fontSize: 12, color: "var(--t3)", textAlign: "right" }}>{st?.totalTickets ?? 0}</span>
                    <span style={{ justifySelf: "start", fontSize: 10.5, fontWeight: 600, color: c, background: softFill(c), padding: "3px 9px", borderRadius: 6, whiteSpace: "nowrap" }}>{STATUS_LABEL[t.status]}</span>
                  </div>
                );
              })}
              {triageTotal > 0 && (
                <button onClick={() => setTriageOpen(o => !o)} style={{ width: "100%", textAlign: "left", marginTop: 13, paddingTop: 13, borderTop: "1px solid var(--border-soft)", background: "transparent", border: "none", cursor: "pointer", fontSize: 11.5, color: "var(--t4)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, transform: triageOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }}>▾</span>
                  {triageTotal} tickets need triage · not yet mapped to a theme
                </button>
              )}
              {triageOpen && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 3 }}>
                  {triage.map((t, i) => (
                    <a key={i} href={t.permalink ?? "#"} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", padding: "7px 9px", borderRadius: 7, background: i % 2 ? "transparent" : "var(--surface-2)" }}>
                      <span style={{ fontSize: 12, color: "var(--t1)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                      <span style={{ fontSize: 9.5, fontWeight: 600, color: "var(--accent)", background: "var(--accent-soft)", borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap" }}>{t.project}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* R&D Pipeline */}
            <div style={card}>
              <div style={eyebrow}>R&amp;D Pipeline · Voice &amp; Audio</div>
              <p style={{ fontSize: 12.5, color: "var(--t2)", lineHeight: 1.55, margin: "12px 0 0", maxWidth: 820 }}>{RND_THESIS}</p>
              <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, alignItems: "start" }} className="rm-rnd">
                {RND_STAGE_ORDER.map(stage => {
                  const tracks = RND_TRACKS.filter(t => t.stage === stage);
                  const c = STAGE_COLOR[stage];
                  return (
                    <div key={stage} style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, paddingBottom: 8, borderBottom: `2px solid ${c}` }}>
                        <Dot color={c} size={6} />
                        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: c }}>{RND_STAGE_LABEL[stage]}</span>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: "var(--t4)", marginLeft: "auto" }}>{tracks.length}</span>
                      </div>
                      {tracks.map((t, i) => (
                        <div key={i} style={{ background: "var(--surface-2)", borderRadius: 9, padding: "10px 11px" }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t1)", marginBottom: 4, lineHeight: 1.3 }}>{t.name}</div>
                          <div style={{ fontSize: 11, color: "var(--t3)", lineHeight: 1.4 }}>{t.what}</div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Right column (decision sidebar) ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>

            {/* Priority Order */}
            <div style={card}>
              <div style={eyebrow}>Priority Order</div>
              <div style={{ marginTop: 15, display: "flex", flexDirection: "column", gap: 10 }}>
                {PRIORITIES.map((label, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <span style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, background: i < 2 ? "var(--accent)" : "var(--surface-2)", color: i < 2 ? "#fff" : "var(--t3)", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", ...tnum }}>{i + 1}</span>
                    <span style={{ fontSize: 12.5, color: "var(--t1)", fontWeight: i < 2 ? 600 : 400, lineHeight: 1.35 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Company Health */}
            <div style={card}>
              <div style={eyebrow}>Company Health</div>
              <div style={{ marginTop: 15, display: "flex", flexDirection: "column", gap: 14 }}>
                {HEALTH_METRICS.map((h, i) => {
                  const c = STATUS_COLOR[h.status];
                  return (
                    <div key={i}>
                      <span style={{ fontSize: 12.5, color: "var(--t1)", fontWeight: 500 }}>{h.label}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                        <Dot color={c} />
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: c }}>{h.statusText}</span>
                        <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 10.5, color: "var(--t4)" }}>→ {h.target}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* This Week */}
            <div style={card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ ...eyebrow, color: "var(--amber)" }}>This Week</div>
                {overdue > 0 && <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: "var(--amber)" }}>{overdue} overdue</span>}
              </div>
              <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 7 }}>
                {weekTickets.length === 0 ? (
                  <span style={{ fontSize: 12, color: "var(--t4)" }}>Nothing due in the next 7 days.</span>
                ) : weekTickets.map((w, i) => (
                  <a key={i} href={w.permalink ?? "#"} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11.5, padding: "6px 11px", borderRadius: 20, background: "var(--surface-2)", color: "var(--t1)", maxWidth: "100%", textDecoration: "none" }}>
                    <Dot color={w.overdue ? "var(--amber)" : "var(--blue)"} size={6} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</span>
                  </a>
                ))}
                {weekTotal > weekTickets.length && <span style={{ fontSize: 11, color: "var(--t4)", alignSelf: "center" }}>+{weekTotal - weekTickets.length} more</span>}
              </div>
            </div>

            {/* Risk Register */}
            <div style={card}>
              <div style={eyebrow}>Risk Register</div>
              <div style={{ marginTop: 15, display: "flex", flexDirection: "column", gap: 16 }}>
                {([["High", RISK_REGISTER.high, "var(--amber)"], ["Medium", RISK_REGISTER.medium, "var(--blue)"], ["Low", RISK_REGISTER.low, "var(--green)"]] as const).map(([label, items, c], i) => (
                  <div key={i}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                      <Dot color={c} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: c, letterSpacing: ".02em" }}>{label}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, paddingLeft: 14 }}>
                      {items.map((r, j) => <span key={j} style={{ fontSize: 12, color: "var(--t2)", lineHeight: 1.4 }}>{r}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTO Commentary */}
            <div style={card}>
              <div style={eyebrow}>CTO Commentary</div>
              <p style={{ fontSize: 13, color: "var(--t1)", lineHeight: 1.6, margin: "14px 0 13px" }}>{CTO_COMMENTARY.intro}</p>
              <div style={{ fontSize: 11.5, color: "var(--t3)", marginBottom: 8 }}>Success over the next 60 days depends on:</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                {CTO_COMMENTARY.next60.map((n, i) => (
                  <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                    <span style={{ display: "flex", alignItems: "center", height: 18, flexShrink: 0 }}><Dot color="var(--accent)" size={5} /></span>
                    <span style={{ fontSize: 12.5, color: "var(--t1)", lineHeight: "18px" }}>{n}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 13, fontStyle: "italic", color: "var(--accent)", fontWeight: 500, borderLeft: "3px solid var(--accent)", paddingLeft: 14, lineHeight: 1.55 }}>&ldquo;{CTO_COMMENTARY.mantra}&rdquo;</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1100px) {
          .rm-kpi { grid-template-columns: repeat(3, minmax(0,1fr)) !important; }
          .rm-main { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 760px) {
          .rm-kpi { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
          .rm-2col { grid-template-columns: 1fr !important; }
          .rm-rnd { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ── Flagship card ─────────────────────────────────────────────────────────
function FlagshipCard({ theme, stats }: { theme: RoadmapTheme; stats?: ThemeLiveStats }) {
  const pct = stats?.completedPct ?? 0;
  return (
    <div style={{ ...card, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ ...eyebrow, fontSize: 10, marginBottom: 3 }}>Flagship Product</div>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.015em" }}>{theme.name}</span>
        </div>
        <StatusPill status={theme.status} />
      </div>
      <p style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.55, margin: 0, maxWidth: 680 }}>{theme.objective}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 13, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 120, height: 6, borderRadius: 4, background: "var(--surface-2)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "var(--green)", borderRadius: 4 }} />
          </div>
          <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: "var(--t2)" }}>{pct}%</span>
        </div>
        {stats && <span style={{ fontFamily: MONO, fontSize: 11.5, color: "var(--t3)" }}>{stats.totalTickets} tickets</span>}
        {stats && stats.inFlightTickets > 0 && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: MONO, fontSize: 11, fontWeight: 600, color: "var(--blue)" }}>
            <Dot color="var(--blue)" size={6} />{stats.inFlightTickets} in flight
          </span>
        )}
      </div>

      <div style={{ height: 1, background: "var(--border-soft)" }} />

      {/* Now / Next / Later */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 22 }} className="rm-nnl">
        {([["Now", theme.now, "var(--amber)"], ["Next", theme.next, "var(--accent)"], ["Later", theme.later, "var(--t4)"]] as const).map(([title, items, accent]) => (
          <div key={title}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 11 }}>
              <span style={{ width: 16, height: 2, borderRadius: 2, background: accent }} />
              <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: accent }}>{title}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map((it, i) => {
                const m = ITEM_MARK[it.state];
                return (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 10, lineHeight: "18px", flexShrink: 0, color: m.color }}>{m.mark}</span>
                    <span style={{ fontSize: 12.5, lineHeight: 1.42, color: it.state === "todo" ? "var(--t3)" : "var(--t1)" }}>{it.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ height: 1, background: "var(--border-soft)" }} />

      {/* Why / Metrics / Risks */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 22 }} className="rm-nnl">
        <DetailCol title="Why it matters" items={theme.whyItMatters} dot="var(--t4)" />
        <DetailCol title="Success metrics" items={theme.successMetrics} check />
        <DetailCol title="Risks" items={theme.risks} dot="var(--amber)" titleColor="var(--amber)" />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, paddingTop: 2 }}>
        <span style={{ ...eyebrow, fontSize: 10 }}>Owner</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--t1)" }}>{theme.owner}</span>
      </div>
    </div>
  );
}

function DetailCol({ title, items, dot, check, titleColor }: { title: string; items: string[]; dot?: string; check?: boolean; titleColor?: string }) {
  return (
    <div>
      <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: titleColor ?? "var(--t4)", marginBottom: 9 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            {check
              ? <span style={{ fontSize: 9, color: "var(--green)", marginTop: 3, flexShrink: 0 }}>✓</span>
              : <span style={{ width: 4, height: 4, borderRadius: "50%", background: dot, marginTop: 7, flexShrink: 0 }} />}
            <span style={{ fontSize: 12, color: "var(--t2)", lineHeight: 1.42 }}>{it}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
