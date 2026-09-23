"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, isActive } from "./nav";
import ThemeToggle from "./ThemeToggle";
import { OS } from "@/lib/osData";
import { computeMode, istToday } from "@/lib/osLogic";

export default function Sidebar() {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  const mode = OS.modes[computeMode(istToday())];

  return (
    <aside className="side">
      <div className="brand">
        <div className="mark">A</div>
        <div>
          <b>Adwait OS</b>
          <small>{mode.label}</small>
        </div>
      </div>

      <nav className="nav">
        {NAV.map(({ href, label }, i) => (
          <Link key={href} href={href} className={isActive(href, pathname) ? "on" : undefined}>
            {label}
            <span className="k">{i + 1}</span>
          </Link>
        ))}
      </nav>

      <div className="foot">
        <div className="meta">WhatsApp is the input.<br />This is the view.</div>
        <div><ThemeToggle /></div>
      </div>
    </aside>
  );
}
