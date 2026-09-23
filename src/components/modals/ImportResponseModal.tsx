"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ImportResponseModal() {
  const router = useRouter();
  const [open, setOpen]     = useState(false);
  const [raw, setRaw]       = useState("");
  const [status, setStatus] = useState<"idle" | "applying" | "done">("idle");
  const [result, setResult] = useState<{ tasksCreated: number; flags: string[]; noJson?: boolean } | null>(null);

  async function apply() {
    if (!raw.trim()) return;
    setStatus("applying");
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      });
      const data = await res.json() as { tasksCreated: number; flags: string[]; noJson: boolean };
      setResult(data);
      setStatus("done");
      router.refresh();
    } catch {
      setStatus("idle");
    }
  }

  function reset() {
    setRaw("");
    setStatus("idle");
    setResult(null);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn"
      >
        <span>⬇️</span> Import Response
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setOpen(false); reset(); } }}
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
                Import Claude Response
              </h2>
              <button
                onClick={() => { setOpen(false); reset(); }}
                className="text-lg leading-none px-2"
                style={{ color: "var(--text-muted)" }}
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {status === "done" && result ? (
                <div className="flex flex-col gap-4">
                  {result.noJson ? (
                    <div
                      className="p-4"
                      style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r)" }}
                    >
                      <p className="text-sm font-semibold" style={{ color: "var(--watch)" }}>
                        No JSON block found — saved as note only
                      </p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        Make sure Claude's response includes a <code>```json</code> block with the schema.
                      </p>
                    </div>
                  ) : (
                    <div
                      className="p-4"
                      style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r)" }}
                    >
                      <p className="text-sm font-semibold" style={{ color: "var(--ok)" }}>
                        Applied · {result.tasksCreated} task{result.tasksCreated !== 1 ? "s" : ""} created
                        {result.flags.length > 0 ? `, ${result.flags.length} flag${result.flags.length !== 1 ? "s" : ""}` : ""}
                      </p>
                    </div>
                  )}

                  {result.flags.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
                        Flags
                      </p>
                      <ul className="flex flex-col gap-1">
                        {result.flags.map((f, i) => (
                          <li key={i} className="text-sm flex items-start gap-2" style={{ color: "var(--text-dim)" }}>
                            <span style={{ color: "var(--watch)" }}>⚠</span> {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Paste Claude's full response below. Any <code>```json</code> block will be parsed and applied.
                  </p>
                  <textarea
                    value={raw}
                    onChange={(e) => setRaw(e.target.value)}
                    placeholder="Paste Claude's response here…"
                    rows={14}
                    className="w-full px-3 py-2.5 text-sm font-mono border resize-none"
                    style={{
                      borderColor: "var(--line)",
                      borderRadius: "var(--r-s)",
                      background: "var(--surface-2)",
                      color: "var(--ink)",
                    }}
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="px-5 py-4 flex justify-between items-center"
              style={{ borderTop: "1px solid var(--line)" }}
            >
              {status === "done" ? (
                <>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Tasks added to Today view</p>
                  <button
                    onClick={reset}
                    className="btn"
                  >
                    Import another
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    JSON schema: <code>today_tasks</code>, <code>flags</code>, <code>habit_focus</code>
                  </p>
                  <button
                    onClick={apply}
                    disabled={!raw.trim() || status === "applying"}
                    className="btn primary"
                    style={{
                      opacity: !raw.trim() || status === "applying" ? 0.5 : 1,
                    }}
                  >
                    {status === "applying" ? "Applying…" : "Parse & apply"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
