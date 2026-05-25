"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Dumbbell,
  Code2,
  Rocket,
  DollarSign,
  BookOpen,
} from "lucide-react";

const NAV = [
  { href: "/",            label: "Today",      icon: LayoutDashboard, color: "var(--accent)" },
  { href: "/fitness",     label: "Fitness",    icon: Dumbbell,        color: "var(--fitness)" },
  { href: "/technical",   label: "Technical",  icon: Code2,           color: "var(--technical)" },
  { href: "/founder",     label: "Founder",    icon: Rocket,          color: "var(--founder)" },
  { href: "/finance",     label: "Finance",    icon: DollarSign,      color: "var(--finance)" },
  { href: "/reflection",  label: "Reflection", icon: BookOpen,        color: "var(--reflection)" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden lg:flex flex-col w-56 shrink-0 h-screen sticky top-0 border-r"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      {/* Brand */}
      <div className="px-5 py-5 border-b" style={{ borderColor: "var(--border)" }}>
        <span className="text-base font-bold" style={{ color: "var(--text)" }}>Personal OS</span>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Adwait Natekar</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon, color }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: active ? "var(--bg-soft)" : "transparent",
                color: active ? color : "var(--text-dim)",
              }}
            >
              <Icon size={17} style={{ color: active ? color : "var(--text-muted)" }} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Did I execute today?
        </p>
      </div>
    </aside>
  );
}
