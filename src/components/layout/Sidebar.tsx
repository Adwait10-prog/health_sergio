"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/",           label: "Today",      icon: "⊞", accent: "var(--c-today)",      bg: "var(--c-today-bg)" },
  { href: "/fitness",    label: "Fitness",    icon: "◎", accent: "var(--c-fitness)",     bg: "var(--c-fitness-bg)" },
  { href: "/technical",  label: "Technical",  icon: "</>", accent: "var(--c-technical)", bg: "var(--c-technical-bg)" },
  { href: "/work",       label: "Work",       icon: "⬡", accent: "var(--c-technical)",  bg: "var(--c-technical-bg)" },
  { href: "/founder",    label: "Founder",    icon: "✦", accent: "var(--c-founder)",     bg: "var(--c-founder-bg)" },
  { href: "/finance",    label: "Finance",    icon: "$", accent: "var(--c-finance)",     bg: "var(--c-finance-bg)" },
  { href: "/reflection", label: "Reflection", icon: "☐", accent: "var(--c-reflection)", bg: "var(--c-reflection-bg)" },
  { href: "/meetings",   label: "Meetings",   icon: "🤝", accent: "var(--c-founder)",    bg: "var(--c-founder-bg)" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden lg:flex flex-col shrink-0 h-screen sticky top-0"
      style={{
        width: "var(--sidebar-w, 224px)",
        minWidth: "var(--sidebar-w, 224px)",
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Brand */}
      <div style={{ padding: "28px 16px 22px", borderBottom: "1px solid var(--border-light)", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px" }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "var(--text-1)", color: "var(--surface)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800, letterSpacing: "-0.02em", flexShrink: 0,
          }}>N</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>Personal OS</div>
            <div style={{ fontSize: 11, color: "var(--text-4)" }}>Adwait Natekar</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map(({ href, label, icon, accent, bg }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", borderRadius: "var(--radius-sm)",
                background: active ? bg : "transparent",
                color: active ? accent : "var(--text-3)",
                fontWeight: active ? 600 : 500,
                fontSize: 14, textDecoration: "none",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "var(--bg-subtle)"; (e.currentTarget as HTMLElement).style.color = "var(--text-1)"; } }}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-3)"; } }}
            >
              <span style={{
                width: 20, textAlign: "center", fontSize: 13, flexShrink: 0,
                color: active ? accent : "var(--text-3)",
                fontFamily: "monospace",
              }}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-light)" }}>
        <p style={{ fontSize: 11, color: "var(--text-4)", textAlign: "center" }}>
          Did I execute today?
        </p>
      </div>
    </aside>
  );
}
