// Shared "Professional CTO Dashboard" design tokens — scoped to the Work pages only.
// Mirrors the Claude Design handoff (.dc.html root style block). Applied inline on each
// page's outermost wrapper so it overrides the global cream theme + dark mode locally.
import type { CSSProperties } from "react";

export const DASHBOARD_TOKENS: CSSProperties = {
  // @ts-expect-error — CSS custom properties
  "--bg": "#F5F6F8",
  "--surface": "#FFFFFF",
  "--surface-2": "#F3F4F6",
  "--border": "#E7E9ED",
  "--border-soft": "#EEF0F3",
  "--t1": "#15171C",
  "--t2": "#3B3F47",
  "--t3": "#697079",
  "--t4": "#9AA0AB",
  "--accent": "#4F46E5",
  "--accent-soft": "color-mix(in srgb, #4F46E5 11%, #fff)",
  "--green": "#0E9466",
  "--green-soft": "color-mix(in srgb, #0E9466 13%, #fff)",
  "--amber": "#D9590E",
  "--amber-soft": "color-mix(in srgb, #D9590E 13%, #fff)",
  "--blue": "#2563EB",
  "--blue-soft": "color-mix(in srgb, #2563EB 13%, #fff)",
  "--red": "#D6443C",
  "--shadow-sm": "0 1px 2px rgba(16,24,40,.05),0 1px 3px rgba(16,24,40,.03)",
  fontFamily: "'Geist', system-ui, -apple-system, sans-serif",
  background: "var(--bg)",
  minHeight: "100vh",
  color: "var(--t1)",
};

export const MONO = "'Geist Mono', monospace";

// Shared bits used across the three boards
export const card: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  boxShadow: "var(--shadow-sm)",
};

export const eyebrow: CSSProperties = {
  fontFamily: MONO,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: "var(--t4)",
};

export const tnum: CSSProperties = { fontVariantNumeric: "tabular-nums" };

// soft-fill helper
export const softFill = (color: string) => `color-mix(in srgb, ${color} 13%, #fff)`;
