"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { NAV } from "./nav";

// 1–9 jump to a page; E asks the Today page to draft the EoD. Ignored while typing.
export default function Shortcuts() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;

      const n = Number(e.key);
      if (n >= 1 && n <= NAV.length) {
        router.push(NAV[n - 1].href);
        return;
      }
      if ((e.key === "e" || e.key === "E") && pathname === "/") {
        window.dispatchEvent(new CustomEvent("os:draft-eod"));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, pathname]);

  return null;
}
