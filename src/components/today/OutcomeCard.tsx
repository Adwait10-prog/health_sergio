"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Eod {
  isToday: boolean;
  dateLabel: string;
  outcome: string;
  draft: string;
  final: string | null;
  streams: string[];
  time: string;
}

// Split a draft into the outcome line, the "what moved" bullets and the Next: line.
function parse(text: string, outcome: string) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const moved = lines.filter(l => /^[-–•]\s/.test(l)).map(l => l.replace(/^[-–•]\s*/, ""));
  const next = lines.find(l => /^next:/i.test(l)) ?? null;
  return { outcome, moved, next };
}

export default function OutcomeCard({ eod }: { eod: Eod | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(eod?.final ?? eod?.draft ?? "");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { setText(eod?.final ?? eod?.draft ?? ""); }, [eod?.final, eod?.draft]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2200); };

  const draft = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/eod/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!res.ok) throw new Error();
      setEditing(false);
      router.refresh();
    } catch {
      flash("draft failed");
    } finally {
      setBusy(false);
    }
  }, [busy, router]);

  // The topbar button and the E key both dispatch this
  useEffect(() => {
    const h = () => { void draft(); };
    window.addEventListener("os:draft-eod", h);
    return () => window.removeEventListener("os:draft-eod", h);
  }, [draft]);

  async function save() {
    const res = await fetch("/api/eod", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ final: text }) });
    if (res.ok) { setEditing(false); router.refresh(); flash("saved"); } else flash("not saved");
  }

  async function copy() {
    try { await navigator.clipboard.writeText(eod?.final ?? eod?.draft ?? ""); flash("copied"); } catch { flash("copy blocked"); }
  }

  const shown = eod && eod.isToday ? parse(eod.final ?? eod.draft, eod.outcome) : null;
  const pill = busy
    ? <span className="pill watch">drafting…</span>
    : eod?.isToday
      ? eod.final ? <span className="pill ok">posted</span> : <span className="pill watch">draft · {eod.time}</span>
      : <span className="pill">not drafted</span>;

  return (
    <section className="card">
      <div className="card-h">
        <span className="eyebrow">Today&rsquo;s outcome</span>
        {pill}
      </div>

      {editing ? (
        <textarea className="textarea" value={text} onChange={e => setText(e.target.value)} rows={8} style={{ minHeight: 160 }} />
      ) : shown ? (
        <div className="outcome">
          {shown.outcome}
          {shown.moved.length > 0 && <div className="moved">{shown.moved.map((m, i) => <span key={i}>– {m}</span>)}</div>}
          {shown.next && <div className="next">{shown.next}</div>}
        </div>
      ) : (
        <div className="meta" style={{ lineHeight: 1.5 }}>
          {eod && <div style={{ marginBottom: 6 }}>Last: <span style={{ color: "var(--ink-2)" }}>{eod.outcome}</span> <span className="faint">({eod.dateLabel})</span></div>}
          Draft from here (<span className="kbd">E</span>) or send &ldquo;draft my update&rdquo; on WhatsApp.
        </div>
      )}

      <div style={{ display: "flex", gap: "var(--s2)", marginTop: "var(--s3)", flexWrap: "wrap", alignItems: "center" }}>
        {editing ? (
          <>
            <button className="btn sm primary" onClick={save}>Save as posted</button>
            <button className="btn sm" onClick={() => { setEditing(false); setText(eod?.final ?? eod?.draft ?? ""); }}>Cancel</button>
          </>
        ) : eod?.isToday ? (
          <>
            <button className="btn sm primary" onClick={copy}>Copy for group</button>
            <button className="btn sm" onClick={() => setEditing(true)}>Edit</button>
            <button className="btn sm ghost" onClick={draft} disabled={busy}>Redraft</button>
          </>
        ) : (
          <button className="btn sm primary" onClick={draft} disabled={busy}>{busy ? "Drafting…" : "Draft EoD"}</button>
        )}
        {msg && <span className="meta">{msg}</span>}
        {eod?.isToday && !editing && eod.streams.length > 0 && (
          <span className="meta" style={{ marginLeft: "auto" }}>streams: {eod.streams.join(" · ")}</span>
        )}
      </div>
    </section>
  );
}

// Topbar trigger — the card above owns the request.
export function DraftEodButton() {
  return (
    <button className="btn sm" onClick={() => window.dispatchEvent(new CustomEvent("os:draft-eod"))}>
      Draft EoD <span className="kbd">E</span>
    </button>
  );
}
