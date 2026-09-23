"use client";

import { useEffect, useRef, useState } from "react";

// Today's three — a 3-line note, debounced-saved to the DB so it syncs across devices.
export default function TodaysThree({ initialText, compact = false }: { initialText: string; compact?: boolean }) {
  const [text, setText] = useState(initialText);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/os/note", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "three", text }),
        });
        setStatus(res.ok ? "saved" : "error");
      } catch {
        setStatus("error");
      }
    }, 500);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [text]);

  return (
    <div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={"1.\n2.\n3."}
        rows={compact ? 3 : 4}
        style={{
          width: "100%", boxSizing: "border-box", resize: "vertical",
          border: "1px solid var(--border)", borderRadius: "var(--radius-xs)", padding: "9px 10px",
          font: "inherit", fontSize: 13, lineHeight: 1.5, color: "var(--text-1)", background: "var(--bg-subtle)",
          outline: "none", minHeight: compact ? 64 : 84,
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-4)", marginTop: 5 }}>
        <span>Three, not a list. If they ship, the day was good.</span>
        <span style={{ color: status === "error" ? "var(--warn)" : status === "saved" ? "var(--c-fitness)" : "var(--text-4)" }}>
          {status === "saving" ? "saving…" : status === "saved" ? "saved" : status === "error" ? "not saved" : ""}
        </span>
      </div>
    </div>
  );
}
