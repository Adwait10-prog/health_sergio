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
  { href: "/",           label: "Today",     icon: LayoutDashboard, color: "var(--accent)" },
  { href: "/fitness",    label: "Fitness",   icon: Dumbbell,        color: "var(--fitness)" },
  { href: "/technical",  label: "Tech",      icon: Code2,           color: "var(--technical)" },
  { href: "/founder",    label: "Founder",   icon: Rocket,          color: "var(--founder)" },
  { href: "/finance",    label: "Finance",   icon: DollarSign,      color: "var(--finance)" },
  { href: "/reflection", label: "Reflect",   icon: BookOpen,        color: "var(--reflection)" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 border-t z-50 flex"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      {NAV.map(({ href, label, icon: Icon, color }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors"
            style={{ color: active ? color : "var(--text-muted)" }}
          >
            <Icon size={20} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
