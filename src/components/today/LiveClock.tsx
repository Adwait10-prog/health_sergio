"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";

export default function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  return (
    <span className="text-sm font-mono tabular-nums" style={{ color: "var(--text-muted)" }}>
      {format(now, "HH:mm:ss")}
    </span>
  );
}
