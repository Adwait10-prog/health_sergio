"use client";

import { OS, type Mode, type Status } from "@/lib/osData";
import type { Tone } from "@/lib/osLogic";
import Checklist from "./Checklist";
import TodaysThree from "./TodaysThree";
import ThemeToggle from "@/components/layout/ThemeToggle";

export interface CountdownView { id: string; label: string; date: string | null; text?: string; days: number | null; tone: Tone; when: string }

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

// Status → Console pill: state colours only where the state matters
const PILL: Record<Status | "reg", { label: string; cls: string }> = {
  done:   { label: "done",        cls: "pill ok" },
  prog:   { label: "in progress", cls: "pill watch" },
  todo:   { label: "to do",       cls: "pill" },
  parked: { label: "parked",      cls: "pill" },
  next:   { label: "next",        cls: "pill accent" },
  reg:    { label: "registered",  cls: "pill info" },
};

function Pill({ s }: { s: Status | "reg" }) {
  return <span className={PILL[s].cls} style={{ flexShrink: 0 }}>{PILL[s].label}</span>;
}

function Card({ title, tag, children }: { title: string; tag?: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <div className="card-h"><span className="eyebrow">{title}</span>{tag && <span className="meta">{tag}</span>}</div>
      {children}
    </section>
  );
}

// Label + optional note on the left, anything on the right
function Row({ label, note, right, strong }: { label: React.ReactNode; note?: string; right?: React.ReactNode; strong?: boolean }) {
  return (
    <div className="row">
      <span className="l"><span style={{ fontWeight: strong ? 500 : 400 }}>{label}</span>{note && <small>{note}</small>}</span>
      {right != null && <span className="r">{right}</span>}
    </div>
  );
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function OsBoard(p: OsBoardProps) {
  const modeInfo = OS.modes[p.mode];
  const sepPct = Math.round((100 * p.separationDone) / p.separationTotal);

  return (
    <div className="main">
      <div className="topbar">
        <div className="left">
          <span className="pill accent"><i className="dot" /> {modeInfo.label}</span>
          <span className="meta">{p.todayLabel}</span>
        </div>
        <div className="right"><ThemeToggle compact /></div>
      </div>

      <div className="modebar">
        <span className="eyebrow" style={{ color: "var(--accent)", whiteSpace: "nowrap" }}>Adwait OS</span>
        <span className="hint">{modeInfo.hint}</span>
      </div>

      {/* Masonry: as many columns as the screen fits, no row-height gaps */}
      <div className="masonry">
        <Card title="Next up" tag={`${p.countdowns.length} countdowns`}>
          {p.countdowns.map(c => {
            const cls = c.tone === "past" ? "later" : c.days == null || (c.days ?? 99) <= 3 ? "now" : (c.days ?? 99) <= 14 ? "soon" : "later";
            return (
              <div key={c.id} className={`cd ${cls}`} style={c.tone === "past" ? { textDecoration: "line-through", color: "var(--ink-4)" } : undefined}>
                <span className="d">{c.days == null ? "—" : c.days < 0 ? "✓" : c.days}</span>
                <span>{c.label}</span>
                <span className="when">{c.when}</span>
              </div>
            );
          })}
        </Card>

        <Card title="Today's three" tag="written the night before">
          <TodaysThree initialText={p.threeText} />
        </Card>

        <Card title="Media separation" tag="Saijash owns the skeleton">
          <div className="val" style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span className="stat">{p.separationDone}</span><span className="meta num">/ {p.separationTotal} · {sepPct}%</span>
          </div>
          <div className="segs" style={{ margin: "var(--s2) 0" }}>
            {OS.separation.map(s => <i key={s.label} className={s.status === "done" ? "done" : s.status === "prog" ? "prog" : ""} />)}
          </div>
          {OS.separation.map(s => <Row key={s.label} label={s.label} right={<Pill s={s.status} />} />)}
          <div className="meta" style={{ marginTop: "var(--s2)" }}>{OS.separationNote}</div>
        </Card>

        <Card title="ElevenLabs partnership" tag="highest leverage">
          <ul className="tl">
            {OS.elevenlabs.map(e => (
              <li key={e.label} className={e.status === "done" ? "done" : e.status === "next" ? "next" : undefined}>
                {e.label}<small>{e.when}</small>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Tech / CTO" tag="my numbers">
          {OS.tech.map(t => <Row key={t.label} label={t.label} note={t.note} strong right={<Pill s={t.status} />} />)}
        </Card>

        <Card title="Corporate" tag="Monday 16:30 only">
          {OS.corpGates.map(g => <Row key={g.date} label={<><span className="num" style={{ fontWeight: 600 }}>{g.date}</span> · {g.target}</>} />)}
          <div className="meta" style={{ marginTop: "var(--s2)", lineHeight: 1.5 }}>{OS.corpNote}</div>
        </Card>

        <Card title="Marathon block" tag="first full · 17 Jan">
          {p.block.index < 0 ? (
            <>
              <div><span className="stat">{p.block.daysToStart > 0 ? p.block.daysToStart : "—"}</span> <span className="meta">days to week 1 (25 Oct)</span></div>
              <div className="meta" style={{ marginTop: "var(--s2)" }}>{OS.blockPreNote}</div>
            </>
          ) : (
            <>
              <div><span className="stat">{p.block.index + 1}</span> <span className="meta num">/ {OS.block.length} weeks</span></div>
              <Row label="Target this week" right={<span className="num">{OS.block[p.block.index].km} km · {OS.block[p.block.index].longRun}</span>} />
            </>
          )}
          <div className="blockwk" style={{ marginTop: "var(--s3)" }}>
            {OS.block.map((w, i) => {
              const max = Math.max(...OS.block.map(b => b.km));
              const cls = i === p.block.index ? "now" : /kolkata|tmm/i.test(w.longRun) ? "race" : /cutback|taper/i.test(w.longRun) ? "cut" : "";
              return <i key={w.weekStart} className={cls} style={{ height: `${Math.max(18, Math.round((w.km / max) * 100))}%` }} title={`wk${i + 1} · ${w.km || "race"} km · ${w.longRun}`} />;
            })}
          </div>
          <div className="meta" style={{ marginTop: "var(--s2)", lineHeight: 1.5 }}>{OS.blockNote}</div>
          <div className="meta" style={{ marginTop: 6, lineHeight: 1.5 }}>{OS.kolkataNote}</div>
        </Card>

        <Card title="Procam Slam" tag={`${inr(OS.slamSpent)} of ${inr(OS.slamTotal)}`}>
          {OS.slam.map(r => <Row key={r.race} label={r.race} note={`${r.date} · ${r.note}`} strong right={<Pill s={r.status} />} />)}
          <div className="bar" style={{ marginTop: "var(--s3)" }}><i style={{ width: `${p.slamPct}%` }} /></div>
          <div className="meta" style={{ marginTop: 6 }}>{p.slamPct}% spent · {inr(p.slamRemaining)} to go, almost all Kolkata flights.</div>
        </Card>

        <Card title="Money" tag="labelled by purpose">
          {OS.money.map(m => <Row key={m.label} label={m.label} note={m.note} right={<span className="num" style={{ fontWeight: 600 }}>{m.amount}</span>} />)}
          <div className="meta" style={{ marginTop: "var(--s2)", lineHeight: 1.5 }}>{OS.moneyNote}</div>
        </Card>

        <Card title="Follow the money" tag="4 weeks · skeleton mode">
          <Checklist listKey="ftm" items={OS.ftm} initialDone={p.doneMap.ftm} />
        </Card>

        <Card title="Learning" tag="3 hrs/week">
          {OS.learn.map(l => <Row key={l.label} label={l.label} note={l.note} strong />)}
        </Card>

        <Card title="Side projects" tag="one at a time">
          {OS.side.map(s => <Row key={s.label} label={s.label} note={s.note} strong right={<Pill s={s.status} />} />)}
        </Card>

        <Card title="The three rules" tag="the floor">
          {OS.rules.map((r, i) => (
            <div key={i} className="row" style={{ justifyContent: "flex-start", alignItems: "flex-start" }}>
              <span className="num faint" style={{ flexShrink: 0 }}>{i + 1}</span>
              <span style={{ lineHeight: 1.45 }}>{r}</span>
            </div>
          ))}
        </Card>

        <Card title="EoD update format" tag="6–7pm · outcome first">
          <div className="outcome" style={{ whiteSpace: "pre-wrap", fontSize: "var(--t-body)" }}>{OS.eod.template}</div>
          <div className="meta" style={{ marginTop: "var(--s2)", lineHeight: 1.5 }}>{OS.eod.note}</div>
        </Card>
      </div>

      {/* Open items: full width, flows into columns too */}
      <section className="card">
        <div className="card-h"><span className="eyebrow">Open items</span><span className="meta">everything, one place</span></div>
        <div style={{ columns: "340px", columnGap: "var(--s6)" }}>
          <Checklist listKey="open" items={OS.open} initialDone={p.doneMap.open} />
        </div>
      </section>

      <div className="meta faint" style={{ marginTop: "var(--s4)", textAlign: "center" }}>
        Ticks and today&rsquo;s three save to the database · review end of October when block mode starts.
      </div>
    </div>
  );
}
