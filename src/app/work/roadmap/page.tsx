import { db } from "@/lib/db";
import RoadmapBoard from "@/components/work/RoadmapBoard";
import { THEMES } from "@/lib/roadmapData";

export const dynamic = "force-dynamic";

// Per-theme live grounding computed from Asana tasks in the theme's projects.
export interface ThemeLiveStats {
  themeId: number;
  totalTickets: number;
  completedTickets: number;
  inFlightTickets: number;   // incomplete tickets matching any Now/Next/Later `match` keyword
  matchedTicketNames: string[]; // names of in-flight tickets that grounded an item
}

// Tickets that don't map to any theme keyword — surfaced for triage.
export interface TriageTicket {
  name: string;
  project: string;
  sectionName: string | null;
  assigneeName: string | null;
  permalink: string | null;
}

export default async function RoadmapPage() {
  // Pull all top-level incomplete + complete tasks with their project name, once.
  const projects = await db.asanaProject.findMany({
    where: { isTracked: true },
    select: {
      name: true,
      tasks: {
        where: { parentGid: null },
        select: { name: true, status: true, sectionName: true, assigneeName: true, permalink: true },
      },
    },
  });

  const projectTasks = new Map<string, typeof projects[number]["tasks"]>();
  for (const p of projects) projectTasks.set(p.name, p.tasks);

  // Build a global set of all match keywords (across all themes) for triage detection.
  const allMatchKeywords = THEMES
    .flatMap(t => [...t.now, ...t.next, ...t.later])
    .flatMap(i => i.match ?? [])
    .map(k => k.toLowerCase());

  // Per-theme grounding
  const liveStats: ThemeLiveStats[] = THEMES.map(theme => {
    const themeProjects = theme.projects ?? [];
    const tasks = themeProjects.flatMap(pn => projectTasks.get(pn) ?? []);

    const matchKeywords = [...theme.now, ...theme.next, ...theme.later]
      .flatMap(i => i.match ?? [])
      .map(k => k.toLowerCase());

    const matchedNames = new Set<string>();
    let inFlight = 0;
    for (const t of tasks) {
      if (t.status === "incomplete") {
        const hay = t.name.toLowerCase();
        if (matchKeywords.some(k => hay.includes(k))) {
          inFlight++;
          matchedNames.add(t.name);
        }
      }
    }

    return {
      themeId: theme.id,
      totalTickets: tasks.length,
      completedTickets: tasks.filter(t => t.status === "complete").length,
      inFlightTickets: inFlight,
      matchedTicketNames: Array.from(matchedNames).slice(0, 6),
    };
  });

  // Triage: incomplete tickets across ALL projects that don't match any theme keyword.
  // Skip Media Squad here — it has its own dedicated analysis page and would flood triage.
  const triage: TriageTicket[] = [];
  for (const p of projects) {
    if (p.name === "Media Squad") continue;
    for (const t of p.tasks) {
      if (t.status !== "incomplete") continue;
      const hay = t.name.toLowerCase();
      if (allMatchKeywords.some(k => hay.includes(k))) continue; // already grounded
      triage.push({
        name: t.name,
        project: p.name,
        sectionName: t.sectionName,
        assigneeName: t.assigneeName,
        permalink: t.permalink,
      });
    }
  }
  // Sort by project then name, cap to keep it scannable
  triage.sort((a, b) => a.project.localeCompare(b.project) || a.name.localeCompare(b.name));

  return (
    <RoadmapBoard
      liveStats={liveStats}
      triage={triage.slice(0, 20)}
      triageTotal={triage.length}
      generatedAt={new Date().toISOString()}
    />
  );
}
