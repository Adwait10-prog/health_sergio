// Which streams this week's EoDs touched: stacked bar + legend (days tagged / days so far).
const COLOR: Record<string, string> = {
  v2: "var(--ink)", separation: "var(--ink-3)", partnership: "var(--info)", research: "var(--accent)",
  money: "var(--ok)", box: "var(--ink-4)", corporate: "var(--ink-2)", delivery: "var(--line-2)", tooling: "var(--surface-2)",
};

export default function StreamsBar({ streams, days }: { streams: { key: string; days: number; over: boolean }[]; days: number }) {
  const total = streams.reduce((s, x) => s + x.days, 0);
  const range = days === 1 ? "Mon" : `Mon–${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][days - 1]}`;
  return (
    <section className="card">
      <div className="card-h"><span className="eyebrow">Streams · {range}</span><span className="meta">{days} day{days === 1 ? "" : "s"}</span></div>
      {total === 0 ? (
        <div className="meta">No EoDs yet this week.</div>
      ) : (
        <>
          <div className="streams">
            {streams.map(s => <i key={s.key} style={{ width: `${(s.days / total) * 100}%`, background: COLOR[s.key] }} />)}
          </div>
          <div className="legend">
            {streams.map(s => (
              <span key={s.key}>
                <i style={{ background: COLOR[s.key], border: s.key === "tooling" ? "1px solid var(--line-2)" : undefined }} />
                {s.key} {s.days}/{days}{s.over && <b style={{ color: "var(--act)", fontWeight: 600 }}> over</b>}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
