import { db } from "@/lib/db";
import AnalysisBoard from "@/components/work/AnalysisBoard";

export const dynamic = "force-dynamic";

export interface MediaTicket {
  asanaGid: string;
  name: string;
  notes: string | null;
  sectionName: string | null;
  assigneeName: string | null;
  permalink: string | null;
}

// Sections that represent active/decision-stage work worth a tech look.
// Skip "Done" and stale sales-only buckets.
const PREFERRED_SECTIONS = ["Work in Progress", "WIP", "Prioritized", "Planning/Scoping", "Exploring", "Sales Initiatives", "Feedback Pending"];

export default async function AnalysisPage() {
  const project = await db.asanaProject.findFirst({
    where: { name: "Media Squad", isTracked: true },
    select: {
      name: true,
      tasks: {
        where: { status: "incomplete", parentGid: null },
        select: { asanaGid: true, name: true, notes: true, sectionName: true, assigneeName: true, permalink: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  const all = project?.tasks ?? [];

  // Rank: preferred sections first, then most recently updated. Take top 6.
  const ranked = [...all].sort((a, b) => {
    const ai = PREFERRED_SECTIONS.indexOf(a.sectionName ?? "");
    const bi = PREFERRED_SECTIONS.indexOf(b.sectionName ?? "");
    const aRank = ai === -1 ? 99 : ai;
    const bRank = bi === -1 ? 99 : bi;
    if (aRank !== bRank) return aRank - bRank;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  const top: MediaTicket[] = ranked.slice(0, 6).map(t => ({
    asanaGid: t.asanaGid,
    name: t.name,
    notes: t.notes,
    sectionName: t.sectionName,
    assigneeName: t.assigneeName,
    permalink: t.permalink,
  }));

  return <AnalysisBoard tickets={top} totalIncomplete={all.length} />;
}
