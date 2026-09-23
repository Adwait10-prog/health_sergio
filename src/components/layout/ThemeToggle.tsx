"use client";

import { useEffect, useState } from "react";

// Flips html.dark and remembers the choice (the head script in layout.tsx applies it before paint).
export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = document.documentElement.classList.toggle("dark");
    setDark(next);
    try { localStorage.setItem("os-theme", next ? "dark" : "light"); } catch { /* private mode */ }
  }

  return (
    <button className="btn sm ghost theme-btn" onClick={toggle} aria-label="Toggle dark mode">
      {compact ? (dark ? "○" : "◐") : dark ? "○ Light" : "◐ Dark"}
    </button>
  );
}
