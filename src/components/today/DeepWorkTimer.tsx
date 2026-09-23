"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Square } from "lucide-react";

export default function DeepWorkTimer() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [saved, setSaved] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  function fmt(s: number) {
    const h = Math.floor(s / 3600).toString().padStart(2, "0");
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${h}:${m}:${sec}`;
  }

  async function stop() {
    setRunning(false);
    const mins = Math.round(elapsed / 60);
    if (mins < 1) return;
    await fetch("/api/log/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deepWorkMin: mins }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div style={{
      background: "var(--surface)", borderRadius: "var(--r)", border: "1px solid var(--line)",
      padding: 24, display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div>
        <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-4)", marginBottom: 4 }}>Deep Work Timer</p>
        <p style={{ fontSize: 32, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--text-1)", letterSpacing: "-0.02em", lineHeight: 1 }}>
          {fmt(elapsed)}
        </p>
        {saved && <p style={{ fontSize: 12, color: "var(--ok)", marginTop: 4 }}>Saved ✓</p>}
      </div>
      {!running ? (
        <button
          onClick={() => { setRunning(true); setSaved(false); }}
          className="btn primary"
          style={{ fontWeight: 600, gap: 6 }}
        >
          ▶ Start
        </button>
      ) : (
        <button
          onClick={stop}
          className="btn"
          style={{ fontWeight: 600, gap: 6 }}
        >
          ⏸ Pause
        </button>
      )}
    </div>
  );
}
