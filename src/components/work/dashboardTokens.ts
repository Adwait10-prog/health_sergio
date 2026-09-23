// Small style helpers for the Work pages. Colours come from the global Console tokens
// (globals.css), so these pages follow light/dark like every other page.
import type { CSSProperties } from "react";

export const MONO = "var(--mono)";

export const card: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r)",
};

export const eyebrow: CSSProperties = {
  fontFamily: MONO,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: "var(--ink-4)",
};

export const tnum: CSSProperties = { fontVariantNumeric: "tabular-nums" };

// soft-fill helper — transparent base so it works on light and dark surfaces
export const softFill = (color: string) => `color-mix(in srgb, ${color} 13%, transparent)`;
