import { OS } from "@/lib/osData";

// The 13-week marathon block: bar height = weekly km; now / cutback / race weeks marked.
export default function BlockChart({ index, daysToStart }: { index: number; daysToStart: number }) {
  const max = Math.max(...OS.block.map(w => w.km));
  const peakAt = OS.block.findIndex(w => w.km === max);
  const peak = OS.block[peakAt];
  const isRace = (l: string) => /kolkata|tmm/i.test(l);
  const isCut = (l: string) => /cutback|taper/i.test(l);

  return (
    <section className="card">
      <div className="card-h">
        <span className="eyebrow">Marathon block</span>
        <span className="meta">{index >= 0 ? `week ${index + 1} of ${OS.block.length}` : daysToStart > 0 ? `starts 25 Oct · ${daysToStart}d` : "done"}</span>
      </div>
      <div className="blockwk" aria-label={`${OS.block.length}-week km plan`}>
        {OS.block.map((w, i) => {
          const cls = i === index ? "now" : isRace(w.longRun) ? "race" : isCut(w.longRun) ? "cut" : "";
          return <i key={w.weekStart} className={cls} style={{ height: `${Math.max(18, Math.round((w.km / max) * 100))}%` }} title={`wk${i + 1} · ${w.km || "race"} km · ${w.longRun}`} />;
        })}
      </div>
      <div className="blockmeta meta">
        <span>wk 1 · {OS.block[0].km} km</span>
        <span>peak wk {peakAt + 1} · {peak.km} km / {peak.longRun.replace(/\s*peak$/, "")} long</span>
        <span>TMM</span>
      </div>
      <div className="meta" style={{ marginTop: "var(--s2)" }}>{index >= 0 ? OS.blockNote : `${OS.blockPreNote} Easy long runs ≤158 HR.`}</div>
    </section>
  );
}
