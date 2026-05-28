"use client";

interface Props {
  label: string;
  score: number;
  size?: number;
  color?: string;
  sublabel?: string;
}

export default function ScoreRing({ label, score, size = 88, color, sublabel }: Props) {
  const strokeWidth = 7;
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = score > 0 ? Math.min(score / 100, 1) : 0;
  const offset = circ * (1 - pct);

  const resolvedColor = color || (
    score >= 80 ? "var(--c-fitness)" :
    score >= 60 ? "var(--c-today)" :
    score >= 40 ? "var(--c-founder)" :
    "var(--text-4)"
  );

  const tier =
    score >= 85 ? "🏆" :
    score >= 70 ? "✨" :
    score >= 50 ? "📈" :
    score > 0   ? "💪" : "";

  const display = score > 0 ? score : "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-subtle)" strokeWidth={strokeWidth} />
          {pct > 0 && (
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={resolvedColor} strokeWidth={strokeWidth}
              strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.34,1.56,0.64,1)" }}
            />
          )}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: size * 0.26, fontWeight: 700, color: "var(--text-1)", lineHeight: 1 }}>{display}</span>
          {tier && <span style={{ fontSize: size * 0.16, marginTop: 2 }}>{tier}</span>}
        </div>
      </div>
      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-3)", textAlign: "center" }}>{label}</span>
      {sublabel && <span style={{ fontSize: 10, color: "var(--text-4)" }}>{sublabel}</span>}
    </div>
  );
}
