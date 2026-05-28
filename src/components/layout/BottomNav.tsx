"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/",           label: "Today",      icon: "⊞", accent: "var(--c-today)" },
  { href: "/fitness",    label: "Fitness",    icon: "◎", accent: "var(--c-fitness)" },
  { href: "/technical",  label: "Tech",       icon: "</>", accent: "var(--c-technical)" },
  { href: "/founder",    label: "Founder",    icon: "✦", accent: "var(--c-founder)" },
  { href: "/finance",    label: "Finance",    icon: "$",  accent: "var(--c-finance)" },
  { href: "/reflection", label: "Reflect",    icon: "☐", accent: "var(--c-reflection)" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 flex z-50"
      style={{
        background: "var(--surface)",
        borderTop: "1px solid var(--border)",
        paddingBottom: "env(safe-area-inset-bottom, 8px)",
      }}
    >
      {NAV.map(({ href, label, icon, accent }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              gap: 2, padding: "6px 4px", textDecoration: "none",
              color: active ? accent : "var(--text-4)",
            }}
          >
            <span style={{ fontSize: 16, fontFamily: "monospace" }}>{icon}</span>
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
