"use client";

import { OS, type Mode, type Status } from "@/lib/osData";
import type { Tone } from "@/lib/osLogic";
import Checklist from "./Checklist";
import TodaysThree from "./TodaysThree";

export interface CountdownView { id: string; label: string; date: string | null; text?: string; days: number | null; tone: Tone }

export interface OsBoardProps {
  todayLabel: string;
  mode: Mode;
  countdowns: CountdownView[];
  separationDone: number;
  separationTotal: number;
  slamPct: number;
  slamRemaining: number;
  block: { index: number; daysToStart: number };
  threeText: string;
  doneMap: { open: Record<string, boolean>; ftm: Record<string, boolean> };
}

// ── styles (warm OS theme — same tokens as the Today page) ──────────────────
const card: React.CSSProperties = {
  background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
  padding: 18, boxShadow: "var(--shadow)",
};
const h2: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: ".06em",
  margin: "0 0 10px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
};
const tag: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 5, background: "var(--bg-subtle)",
  color: "var(--text-3)", textTransform: "none", letterSpacing: 0, whiteSpace: "nowrap",
};
const row: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10,
  padding: "6px 0", borderBottom: "1px dashed var(--border)", fontSize: 13,
};
const small: React.CSSProperties = { fontSize: 11.5, color: "var(--text-4)", display: "block", marginTop: 1 };
const mini: React.CSSProperties = { fontSize: 12, color: "var(--text-3)", marginTop: 8, lineHeight: 1.45 };
const big: React.CSSProperties = { fontSize: 26, fontWeight: 700, color: "var(--text-1)", lineHeight: 1.1 };

const MODE_COLOR: Record<Mode, string> = { skeleton: "var(--c-technical)", block: "var(--warn)", post: "var(--c-fitness)" };
const TONE_COLOR: Record<Tone, string> = { now: "var(--warn)", soon: "var(--c-today)", past: "var(--c-fitness)", later: "var(--text-2)" };

const PILL: Record<Status | "reg", { label: string; color: string }> = {
  done:   { label: "done",        color: "var(--c-fitness)" },
  prog:   { label: "in progress", color: "var(--c-today)" },
  todo:   { label: "to do",       color: "var(--text-4)" },
  parked: { label: "parked",      color: "var(--text-4)" },
  next:   { label: "next",        color: "var(--warn)" },
  reg:    { label: "registered",  color: "var(--c-today)" },
};

function Pill({ s }: { s: Status | "reg" }) {
  const p = PILL[s];
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 5, whiteSpace: "nowrap", flexShrink: 0,
      color: p.color, background: `color-mix(in srgb, ${p.color} 13%, transparent)`,
    }}>{p.label}</span>
  );
}

function Bar({ pct, color = "var(--c-technical)" }: { pct: number; color?: string }) {
  return (
    <div style={{ height: 7, background: "var(--bg-subtle)", borderRadius: 4, overflow: "hidden", margin: "6px 0 2px" }}>
      <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: "100%", background: color, borderRadius: 4 }} />
    </div>
  );
}

function Card({ title, tagText, wide, children }: { title: string; tagText?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ ...card, gridColumn: wide ? "1 / -1" : undefined }}>
      <h2 style={h2}><span>{title}</span>{tagText && <span style={tag}>{tagText}</span>}</h2>
      {children}
    </div>
  );
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function OsBoard(p: OsBoardProps) {
  const modeInfo = OS.modes[p.mode];
  const sepPct = Math.round((100 * p.separationDone) / p.separationTotal);
  const half = Math.ceil(OS.open.length / 2);

  return (
    <div style={{ padding: "36px 40px 80px", maxWidth: 1180, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text-1)", margin: 0, letterSpacing: "-0.02em" }}>Adwait OS</h1>
          <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>{p.todayLabel}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{
            display: "inline-block", padding: "4px 10px", borderRadius: 6, fontWeight: 700, fontSize: 11.5,
            letterSpacing: ".05em", textTransform: "uppercase", color: "#fff", background: MODE_COLOR[p.mode],
          }}>{modeInfo.label}</span>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 5, maxWidth: 420 }}>{modeInfo.hint}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>

        {/* Countdowns */}
        <Card title="Next up" tagText="countdowns">
          {p.countdowns.map(c => (
            <div key={c.id} style={row}>
              <span>
                {c.label}
                {c.date && <small style={small}>{new Date(c.date + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</small>}
              </span>
              <span style={{ fontWeight: 700, whiteSpace: "nowrap", color: TONE_COLOR[c.tone] }}>
                {c.days == null ? c.text : c.days < 0 ? "done" : c.days === 0 ? "today" : `${c.days}d`}
              </span>
            </div>
          ))}
        </Card>

        {/* Today's three */}
        <Card title="Today's three" tagText="written the night before">
          <TodaysThree initialText={p.threeText} />
        </Card>

        {/* Media separation */}
        <Card title="Media separation" tagText="Saijash owns the skeleton">
          <div style={big}>{sepPct}%</div>
          <Bar pct={sepPct} />
          {OS.separation.map(s => <div key={s.label} style={row}><span>{s.label}</span><Pill s={s.status} /></div>)}
          <div style={mini}>{OS.separationNote}</div>
        </Card>

        {/* Tech / CTO */}
        <Card title="Tech / CTO" tagText="my numbers">
          {OS.tech.map(t => (
            <div key={t.label} style={row}>
              <span><b style={{ color: "var(--text-1)", fontWeight: 600 }}>{t.label}</b><small style={small}>{t.note}</small></span>
              <Pill s={t.status} />
            </div>
          ))}
        </Card>

        {/* Corporate */}
        <Card title="Corporate" tagText="Monday 16:30 only">
          {OS.corpGates.map(g => (
            <div key={g.date} style={row}><span><b style={{ fontWeight: 600, color: "var(--text-1)" }}>{g.date}</b> — {g.target}</span></div>
          ))}
          <div style={mini}>{OS.corpNote}</div>
        </Card>

        {/* ElevenLabs */}
        <Card title="ElevenLabs partnership" tagText="highest leverage">
          <div style={{ position: "relative", paddingLeft: 16, borderLeft: "2px solid var(--border)", marginLeft: 6 }}>
            {OS.elevenlabs.map(e => {
              const dot = e.status === "next" ? "var(--warn)" : e.status === "done" ? "var(--c-fitness)" : "var(--c-technical)";
              return (
                <div key={e.label} style={{ position: "relative", padding: "4px 0 8px", fontSize: 13, color: e.status === "done" ? "var(--text-3)" : "var(--text-1)", fontWeight: e.status === "next" ? 600 : 400 }}>
                  <span style={{ position: "absolute", left: -21, top: 9, width: 8, height: 8, borderRadius: "50%", background: dot }} />
                  {e.label}
                  <small style={small}>{e.when}</small>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Procam Slam */}
        <Card title="Procam Slam" tagText={`${inr(OS.slamSpent)} of ${inr(OS.slamTotal)}`}>
          {OS.slam.map(r => (
            <div key={r.race} style={row}>
              <span><b style={{ fontWeight: 600, color: "var(--text-1)" }}>{r.race}</b><small style={small}>{r.date} · {r.note}</small></span>
              <Pill s={r.status} />
            </div>
          ))}
          <Bar pct={p.slamPct} color="var(--warn)" />
          <div style={mini}>{p.slamPct}% spent · {inr(p.slamRemaining)} to go, almost all Kolkata flights.</div>
        </Card>

        {/* Marathon block */}
        <Card title="Marathon block" tagText="first full · 17 Jan">
          {p.block.index < 0 ? (
            <>
              <div style={big}>{p.block.daysToStart > 0 ? `${p.block.daysToStart}d` : "—"}</div>
              <div style={mini}>until block week 1 (25 Oct). {OS.blockPreNote}</div>
            </>
          ) : (
            <>
              <div style={big}>Week {p.block.index + 1} of {OS.block.length}</div>
              <div style={row}><span>Target this week</span><span style={{ fontWeight: 700 }}>{OS.block[p.block.index].km} km · {OS.block[p.block.index].longRun}</span></div>
              <Bar pct={(100 * (p.block.index + 1)) / OS.block.length} color="var(--c-founder)" />
            </>
          )}
          <div style={mini}>{OS.blockNote}</div>
          <div style={mini}>{OS.kolkataNote}</div>
        </Card>

        {/* Money */}
        <Card title="Money" tagText="labelled by purpose">
          {OS.money.map(m => (
            <div key={m.label} style={row}>
              <span>{m.label}<small style={small}>{m.note}</small></span>
              <span style={{ fontWeight: 700, whiteSpace: "nowrap", color: "var(--text-1)" }}>{m.amount}</span>
            </div>
          ))}
          <div style={mini}>{OS.moneyNote}</div>
        </Card>

        {/* Follow the money */}
        <Card title="Follow the money" tagText="4 weeks · skeleton mode">
          <Checklist listKey="ftm" items={OS.ftm} initialDone={p.doneMap.ftm} />
        </Card>

        {/* Learning */}
        <Card title="Learning" tagText="3 hrs/week">
          {OS.learn.map(l => (
            <div key={l.label} style={row}><span><b style={{ fontWeight: 600, color: "var(--text-1)" }}>{l.label}</b><small style={small}>{l.note}</small></span></div>
          ))}
        </Card>

        {/* Side projects */}
        <Card title="Side projects" tagText="one at a time">
          {OS.side.map(s => (
            <div key={s.label} style={row}>
              <span><b style={{ fontWeight: 600, color: "var(--text-1)" }}>{s.label}</b><small style={small}>{s.note}</small></span>
              <Pill s={s.status} />
            </div>
          ))}
        </Card>

        {/* The three rules */}
        <Card title="The three rules" tagText="the floor">
          {OS.rules.map((r, i) => (
            <div key={i} style={{ ...row, alignItems: "flex-start" }}>
              <span style={{ fontWeight: 700, color: "var(--text-4)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
              <span style={{ flex: 1, lineHeight: 1.45 }}>{r}</span>
            </div>
          ))}
        </Card>

        {/* Open items */}
        <Card title="Open items" tagText="everything, one place" wide>
          <div className="os-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
            <Checklist listKey="open" items={OS.open.slice(0, half)} initialDone={p.doneMap.open} />
            <Checklist listKey="open" items={OS.open.slice(half)} initialDone={p.doneMap.open} />
          </div>
        </Card>

        {/* EoD format */}
        <Card title="EoD update format" tagText="6–7pm · outcome first" wide>
          <pre style={{
            margin: 0, background: "var(--bg-subtle)", borderLeft: "3px solid var(--c-technical)", padding: "9px 11px",
            borderRadius: "0 6px 6px 0", fontSize: 12.5, lineHeight: 1.5, whiteSpace: "pre-wrap", font: "inherit", color: "var(--text-2)",
          }}>{OS.eod.template}</pre>
          <div style={mini}>{OS.eod.note}</div>
        </Card>
      </div>

      <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 16, textAlign: "center" }}>
        Edit content in src/lib/osData.ts · ticks and today&rsquo;s three save to the database · review end of October when block mode starts.
      </div>

      <style>{`@media (max-width: 640px) { .os-two-col { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
