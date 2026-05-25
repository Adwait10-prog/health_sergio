interface Props {
  values: number[];
  color?: string;
  height?: number;
  width?: number;
}

export default function Sparkline({ values, color = "var(--accent)", height = 32, width = 120 }: Props) {
  if (!values.length) return <div style={{ width, height }} />;

  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - (v / max) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
