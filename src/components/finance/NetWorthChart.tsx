import { format } from "date-fns";

interface DataPoint {
  date: Date;
  netWorthInr: number | null;
}

interface Props {
  data: DataPoint[];
}

function fmt(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n}`;
}

export default function NetWorthChart({ data }: Props) {
  const filtered = data.filter((d) => d.netWorthInr != null) as { date: Date; netWorthInr: number }[];
  if (!filtered.length) {
    return (
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        No net worth data yet — log your first monthly snapshot.
      </p>
    );
  }

  const max = Math.max(...filtered.map((d) => d.netWorthInr), 1);
  const barW = 36;
  const gap  = 8;
  const chartH = 120;
  const totalW = filtered.length * (barW + gap);

  return (
    <div className="overflow-x-auto">
      <svg width={totalW} height={chartH + 32} style={{ display: "block" }}>
        {filtered.map((d, i) => {
          const h = Math.max(4, (d.netWorthInr / max) * chartH);
          const x = i * (barW + gap);
          const y = chartH - h;
          return (
            <g key={i}>
              <rect
                x={x} y={y} width={barW} height={h}
                rx={4}
                fill="var(--finance)"
                opacity={i === filtered.length - 1 ? 1 : 0.55}
              />
              <text
                x={x + barW / 2} y={chartH + 14}
                textAnchor="middle"
                fontSize={9}
                fill="var(--text-muted)"
              >
                {format(new Date(d.date), "MMM")}
              </text>
              {i === filtered.length - 1 && (
                <text
                  x={x + barW / 2} y={y - 5}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight="600"
                  fill="var(--finance)"
                >
                  {fmt(d.netWorthInr)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
