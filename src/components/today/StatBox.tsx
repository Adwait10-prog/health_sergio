import type { ReactNode } from "react";

// One of the five numbers: eyebrow → value + unit → a visual → target line + delta.
export default function StatBox({ eyebrow, value, unit, visual, note, delta, tone = "flat" }: {
  eyebrow: string;
  value: ReactNode;
  unit?: ReactNode;
  visual: ReactNode;
  note: ReactNode;
  delta?: ReactNode;
  tone?: "up" | "down" | "flat";
}) {
  return (
    <div className="statbox">
      <span className="eyebrow">{eyebrow}</span>
      <div className="val"><span className="stat">{value}</span>{unit != null && <span className="unit">{unit}</span>}</div>
      {visual}
      <div className="tgt"><span>{note}</span>{delta != null && <span className={`delta ${tone}`}>{delta}</span>}</div>
    </div>
  );
}

// Sparkline on a 100×28 box, zero-based, optional dashed target line. Empty → a flat empty bar.
export function Spark({ values, target, area = true }: { values: number[]; target?: number | null; area?: boolean }) {
  if (values.length === 0) return <div className="bar"><i style={{ width: 0 }} /></div>;
  const hi = Math.max(...values, target ?? 0, 1) * 1.1;
  const y = (v: number) => +(26 - (v / hi) * 22).toFixed(1);
  const pts = values.length === 1
    ? [[0, y(values[0])], [100, y(values[0])]]
    : values.map((v, i) => [+((i / (values.length - 1)) * 100).toFixed(1), y(v)]);
  const line = pts.map(([x, yy], i) => `${i ? "L" : "M"}${x},${yy}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg className="spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden>
      {target != null && <line className="tgtline" x1="0" y1={y(target)} x2="100" y2={y(target)} />}
      {area && <path className="area" d={`${line} L100,28 L0,28Z`} />}
      <path d={line} />
      <circle className="last" cx={last[0]} cy={last[1]} r="2" />
    </svg>
  );
}
