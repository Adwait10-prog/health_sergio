import { db } from "@/lib/db";
import RoadmapBoard from "@/components/work/RoadmapBoard";
import { THEMES } from "@/lib/roadmapData";

export const dynamic = "force-dynamic";

export interface ThemeLiveStats {
  themeId: number;
  totalTickets: number;
  completedTickets: number;
  inFlightTickets: number;
  matchedTicketNames: string[];
  completedPct: number;
  trend: "up" | "down" | "flat" | "new"; // vs previous snapshot
}

export interface TriageTicket {
  name: string;
  project: string;
  sectionName: string | null;
  assigneeName: string | null;
  permalink: string | null;
}

// A ticket due (or overdue) within the current week — powers the "This Week" strip.
export interface WeekTicket {
  name: string;
  project: string;
  dueOn: string;
  overdue: boolean;
  permalink: string | null;
}

export default async function RoadmapPage() {
  const projects = await db.asanaProject.findMany({
    where: { isTracked: true },
    select: {
      name: true,
      tasks: {
        where: { parentGid: null },
        select: { name: true, status: true, sectionName: true, assigneeName: true, dueOn: true, permalink: true },
      },
    },
  });

  const projectTasks = new Map<string, typeof projects[number]["tasks"]>();
  for (const p of projects) projectTasks.set(p.name, p.tasks);

  const allMatchKeywords = THEMES
    .flatMap(t => [...t.now, ...t.next, ...t.later])
    .flatMap(i => i.match ?? [])
    .map(k => k.toLowerCase());

  // ── Per-theme grounding ─────────────────────────────────────────────────
  const rawStats = THEMES.map(theme => {
    const themeProjects = theme.projects ?? [];
    const tasks = themeProjects.flatMap(pn => projectTasks.get(pn) ?? []);
    const matchKeywords = [...theme.now, ...theme.next, ...theme.later]
      .flatMap(i => i.match ?? []).map(k => k.toLowerCase());

    const matchedNames = new Set<string>();
    let inFlight = 0;
    for (const t of tasks) {
      if (t.status === "incomplete") {
        const hay = t.name.toLowerCase();
        if (matchKeywords.some(k => hay.includes(k))) { inFlight++; matchedNames.add(t.name); }
      }
    }
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "complete").length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { themeId: theme.id, totalTickets: total, completedTickets: completed, inFlightTickets: inFlight, matchedTicketNames: Array.from(matchedNames).slice(0, 6), completedPct: pct };
  });

  // ── Trend: read last prior snapshot per theme, then record a fresh one ──
  const prevSnapshots = await db.roadmapSnapshot.findMany({
    orderBy: { capturedAt: "desc" },
    take: THEMES.length * 4, // enough to find the latest per theme
  });
  const prevByTheme = new Map<number, number>();
  for (const s of prevSnapshots) {
    if (!prevByTheme.has(s.themeId)) prevByTheme.set(s.themeId, s.completedPct);
  }

  const liveStats: ThemeLiveStats[] = rawStats.map(s => {
    const prev = prevByTheme.get(s.themeId);
    let trend: ThemeLiveStats["trend"] = "new";
    if (prev != null) {
      if (s.completedPct > prev) trend = "up";
      else if (s.completedPct < prev) trend = "down";
      else trend = "flat";
    }
    return { ...s, trend };
  });

  // Record this load's snapshot (fire-and-forget shape; awaited so it persists)
  await db.roadmapSnapshot.createMany({
    data: rawStats.map(s => ({ themeId: s.themeId, completedPct: s.completedPct, totalTickets: s.totalTickets })),
  });

  // ── Triage: unmapped incomplete tickets (skip Media Squad — own page) ──
  const triage: TriageTicket[] = [];
  for (const p of projects) {
    if (p.name === "Media Squad") continue;
    for (const t of p.tasks) {
      if (t.status !== "incomplete") continue;
      const hay = t.name.toLowerCase();
      if (allMatchKeywords.some(k => hay.includes(k))) continue;
      triage.push({ name: t.name, project: p.name, sectionName: t.sectionName, assigneeName: t.assigneeName, permalink: t.permalink });
    }
  }
  triage.sort((a, b) => a.project.localeCompare(b.project) || a.name.localeCompare(b.name));

  // ── This Week: tickets due within 7 days or overdue, across all projects ──
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 86400000);
  const weekTickets: WeekTicket[] = [];
  for (const p of projects) {
    for (const t of p.tasks) {
      if (t.status !== "incomplete" || !t.dueOn) continue;
      const due = new Date(t.dueOn + "T00:00:00Z");
      if (due <= weekAhead) {
        weekTickets.push({ name: t.name, project: p.name, dueOn: t.dueOn, overdue: due < now, permalink: t.permalink });
      }
    }
  }
  // Overdue first, then soonest due
  weekTickets.sort((a, b) => (a.overdue === b.overdue ? a.dueOn.localeCompare(b.dueOn) : a.overdue ? -1 : 1));

  return (
    <RoadmapBoard
      liveStats={liveStats}
      triage={triage.slice(0, 20)}
      triageTotal={triage.length}
      weekTickets={weekTickets.slice(0, 5)}
      weekTotal={weekTickets.length}
      generatedAt={now.toISOString()}
    />
  );
}
