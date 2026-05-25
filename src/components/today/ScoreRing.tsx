"use client";

import { scoreColor } from "@/lib/scores";
import { useState } from "react";

interface Props {
  label: string;
  score: number;
  size?: number;
  sublabel?: string;
}

export default function ScoreRing({ label, score, size = 88, sublabel }: Props) {
  const [hovered, setHovered] = useState(false);
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = scoreColor(score);

  const tier =
    score >= 85 ? "🏆" :
    score >= 70 ? "✨" :
    score >= 50 ? "📈" :
    score > 0   ? "💪" : "—";

  return (
    <div
      className="flex flex-col items-center gap-1.5 cursor-default select-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ transition: "transform 0.15s ease", transform: hovered ? "translateY(-2px)" : "none" }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        {/* Glow on hover */}
        {hovered && score > 0 && (
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
              transform: "scale(1.1)",
            }}
          />
        )}
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke="var(--bg-soft)" strokeWidth={8}
          />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={color} strokeWidth={8}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-bold leading-none" style={{ fontSize: size * 0.22, color: "var(--text)" }}>
            {score > 0 ? score : "—"}
          </span>
          {score > 0 && (
            <span style={{ fontSize: size * 0.16, marginTop: 2 }}>{tier}</span>
          )}
        </div>
      </div>
      <span className="text-xs font-medium text-center leading-tight" style={{ color: "var(--text-dim)" }}>
        {label}
      </span>
      {sublabel && (
        <span className="text-xs" style={{ color: "var(--text-muted)", fontSize: 10 }}>{sublabel}</span>
      )}
    </div>
  );
}
