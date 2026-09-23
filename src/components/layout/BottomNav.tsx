"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, isActive } from "./nav";

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <nav className="bottomnav" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      {NAV.map(({ href, short }) => (
        <Link key={href} href={href} className={isActive(href, pathname) ? "on" : undefined}>
          <i />
          {short}
        </Link>
      ))}
    </nav>
  );
}
