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
    <div
      className="rounded-xl p-4 flex items-center gap-4"
      style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
    >
      <div className="flex-1">
        <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Deep Work Timer</p>
        <p className="text-2xl font-mono font-bold tracking-tight" style={{ color: "var(--text)" }}>
          {fmt(elapsed)}
        </p>
        {saved && <p className="text-xs mt-1" style={{ color: "var(--accent)" }}>Saved ✓</p>}
      </div>
      {!running ? (
        <button
          onClick={() => { setRunning(true); setSaved(false); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          <Play size={14} /> Start
        </button>
      ) : (
        <button
          onClick={stop}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          style={{ background: "var(--warn)", color: "#fff" }}
        >
          <Square size={14} /> Stop
        </button>
      )}
    </div>
  );
}
