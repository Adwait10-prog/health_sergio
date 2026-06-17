import { db } from "@/lib/db";
import AnalysisBoard from "@/components/work/AnalysisBoard";

export const dynamic = "force-dynamic";

export interface MediaTicket {
  asanaGid: string;
  name: string;
  notes: string | null;
  sectionName: string | null;
  assigneeName: string | null;
  dueOn: string | null;
  permalink: string | null;
  preselected: boolean; // top-ranked → checked by default
}

// Sections that represent active/decision-stage work worth a tech look.
const PREFERRED_SECTIONS = ["Work in Progress", "WIP", "Prioritized", "Planning/Scoping", "Exploring", "Sales Initiatives", "Feedback Pending"];

// Score a ticket — lower is higher priority. Combines section stage + due-date urgency.
function rankScore(t: { sectionName: string | null; dueOn: string | null; updatedAt: Date }, today: Date): number {
  const si = PREFERRED_SECTIONS.indexOf(t.sectionName ?? "");
  const sectionRank = si === -1 ? 99 : si; // 0..6, else 99

  // Due-date urgency: overdue or due-soon pulls a ticket up regardless of section.
  let dueBonus = 0;
  if (t.dueOn) {
    const due = new Date(t.dueOn + "T00:00:00Z").getTime();
    const days = Math.round((due - today.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) dueBonus = -50;       // overdue — strongest pull
    else if (days <= 7) dueBonus = -30; // due this week
    else if (days <= 30) dueBonus = -10; // due this month
  }

  return sectionRank * 10 + dueBonus;
}

export default async function AnalysisPage() {
  const project = await db.asanaProject.findFirst({
    where: { name: "Media Squad", isTracked: true },
    select: {
      name: true,
      tasks: {
        where: { status: "incomplete", parentGid: null },
        select: { asanaGid: true, name: true, notes: true, sectionName: true, assigneeName: true, dueOn: true, permalink: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  const all = project?.tasks ?? [];
  const today = new Date();

  // Rank: section stage + due-date urgency, then recency as tie-break.
  const ranked = [...all].sort((a, b) => {
    const sa = rankScore(a, today);
    const sb = rankScore(b, today);
    if (sa !== sb) return sa - sb;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  const topGids = new Set(ranked.slice(0, 6).map(t => t.asanaGid));

  // Pass ALL tickets to the client (ranked order) so the keyword filter can add more.
  const tickets: MediaTicket[] = ranked.map(t => ({
    asanaGid: t.asanaGid,
    name: t.name,
    notes: t.notes,
    sectionName: t.sectionName,
    assigneeName: t.assigneeName,
    dueOn: t.dueOn,
    permalink: t.permalink,
    preselected: topGids.has(t.asanaGid),
  }));

  return <AnalysisBoard tickets={tickets} totalIncomplete={all.length} />;
}
