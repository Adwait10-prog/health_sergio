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

export default async function RoadmapPage() {
  // Pull all top-level tasks with their project name, once.
  const projects = await db.asanaProject.findMany({
    where: { isTracked: true },
    select: {
      name: true,
      tasks: {
        where: { parentGid: null },
        select: { name: true, status: true, sectionName: true },
      },
    },
  });

  const projectTasks = new Map<string, { name: string; status: string; sectionName: string | null }[]>();
  for (const p of projects) projectTasks.set(p.name, p.tasks);

  // Gather every `match` keyword per theme
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

  return <RoadmapBoard liveStats={liveStats} generatedAt={new Date().toISOString()} />;
}
