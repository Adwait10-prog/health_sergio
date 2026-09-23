"use client";

import { useState } from "react";
import { MONO } from "./dashboardTokens";

export default function CeoUpdateButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [update, setUpdate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setOpen(true);
    setLoading(true);
    setError(null);
    setUpdate(null);
    setCopied(false);
    try {
      const res = await fetch("/api/roadmap/ceo-update", { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Failed to generate");
      setUpdate(data.update);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!update) return;
    try {
      await navigator.clipboard.writeText(update);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  return (
    <>
      <button onClick={generate} style={{
        fontSize: 12.5, fontWeight: 600, color: "var(--bg)", background: "var(--ink)",
        border: "none", borderRadius: 9, padding: "9px 14px", cursor: "pointer", whiteSpace: "nowrap",
      }}>Generate CEO update</button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 1000, background: "rgba(16,24,40,.45)",
            display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "48px 20px", overflowY: "auto",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16,
              boxShadow: "0 12px 48px rgba(16,24,40,.18)", width: "100%", maxWidth: 680,
              fontFamily: "'Geist', system-ui, sans-serif",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "18px 22px", borderBottom: "1px solid var(--border-soft)" }}>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ink)", marginBottom: 4 }}>Weekly CTO → CEO Update</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--t1)", letterSpacing: "-.01em" }}>Update for the CEO</div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--t4)", fontSize: 20, lineHeight: 1, padding: "0 2px" }}>×</button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 22px" }}>
              {loading && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--t3)", fontSize: 13, padding: "30px 0", justifyContent: "center" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--ink)", animation: "ceopulse 1s ease-in-out infinite" }} />
                  Reading live Asana state and writing your update…
                </div>
              )}
              {error && (
                <div style={{ padding: "12px 14px", borderRadius: 9, background: "var(--amber-soft)", color: "var(--red)", fontSize: 13 }}>{error}</div>
              )}
              {update && (
                <pre style={{
                  margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word",
                  fontFamily: "'Geist', system-ui, sans-serif", fontSize: 13, lineHeight: 1.6, color: "var(--t1)",
                  maxHeight: "55vh", overflowY: "auto",
                }}>{update}</pre>
              )}
            </div>

            {/* Footer */}
            {update && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, padding: "14px 22px", borderTop: "1px solid var(--border-soft)" }}>
                <button onClick={generate} style={{
                  fontSize: 12.5, fontWeight: 600, color: "var(--t2)", background: "var(--surface)",
                  border: "1px solid var(--border)", borderRadius: 9, padding: "8px 14px", cursor: "pointer",
                }}>Regenerate</button>
                <button onClick={copy} style={{
                  fontSize: 12.5, fontWeight: 600, color: "var(--bg)", background: copied ? "var(--green)" : "var(--ink)",
                  border: "none", borderRadius: 9, padding: "8px 16px", cursor: "pointer",
                }}>{copied ? "Copied ✓" : "Copy"}</button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes ceopulse { 0%,100% { opacity:1; } 50% { opacity:.3; } }`}</style>
    </>
  );
}
