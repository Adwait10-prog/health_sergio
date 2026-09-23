"use client";

import { useState, useEffect, useCallback } from "react";

export default function CoachBriefModal() {
  const [open, setOpen]       = useState(false);
  const [markdown, setMd]     = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);

  const fetchBrief = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/brief");
      const { markdown } = await res.json() as { markdown: string };
      setMd(markdown);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !markdown) fetchBrief();
  }, [open, markdown, fetchBrief]);

  async function copyToClipboard() {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn"
      >
        <span>📋</span> Coach Brief
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            className="w-full max-w-2xl flex flex-col"
            style={{
              background: "var(--surface)",
              borderRadius: "var(--r)",
              boxShadow: "none",
              border: "1px solid var(--line)",
              maxHeight: "85vh",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--line)" }}
            >
              <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
                Claude Coach Brief
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchBrief}
                  disabled={loading}
                  className="btn sm"
                >
                  {loading ? "Loading…" : "Refresh"}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="text-lg leading-none px-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {loading ? (
                <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
                  Generating brief…
                </p>
              ) : (
                <pre
                  className="text-sm leading-relaxed whitespace-pre-wrap font-mono"
                  style={{ color: "var(--text-dim)" }}
                >
                  {markdown}
                </pre>
              )}
            </div>

            {/* Footer */}
            <div
              className="px-5 py-4 flex justify-between items-center"
              style={{ borderTop: "1px solid var(--line)" }}
            >
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Copy → paste into Claude → get response → use Import Response
              </p>
              <button
                onClick={copyToClipboard}
                disabled={!markdown || loading}
                className="btn primary"
                style={{
                  opacity: !markdown || loading ? 0.5 : 1,
                  ...(copied ? { background: "var(--ok-soft)", borderColor: "transparent", color: "var(--ok)" } : {}),
                }}
              >
                {copied ? "Copied ✓" : "Copy to clipboard"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
