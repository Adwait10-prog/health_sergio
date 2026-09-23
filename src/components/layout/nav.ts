// One nav list for the sidebar, bottom bar and number-key shortcuts (1–9).
export const NAV = [
  { href: "/",           label: "Today",      short: "Today" },
  { href: "/os",         label: "OS",         short: "OS" },
  { href: "/fitness",    label: "Fitness",    short: "Fitness" },
  { href: "/technical",  label: "Technical",  short: "Tech" },
  { href: "/work",       label: "Work",       short: "Work" },
  { href: "/founder",    label: "Founder",    short: "Founder" },
  { href: "/finance",    label: "Finance",    short: "Finance" },
  { href: "/reflection", label: "Reflection", short: "Reflect" },
  { href: "/meetings",   label: "Meetings",   short: "Meet" },
] as const;

export function isActive(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
