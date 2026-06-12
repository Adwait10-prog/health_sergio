import { db } from "@/lib/db";
import WorkBoard from "@/components/work/WorkBoard";

export const dynamic = "force-dynamic";

export default async function WorkPage() {
  const [projects, members, recentEvents] = await Promise.all([
    db.asanaProject.findMany({
      where: { isTracked: true },
      include: {
        tasks: {
          where: { status: "incomplete" },
          orderBy: { updatedAt: "desc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    db.asanaMember.findMany({
      orderBy: { name: "asc" },
    }),
    db.asanaWebhookEvent.findMany({
      orderBy: { receivedAt: "desc" },
      take: 10,
      select: {
        id: true,
        eventType: true,
        resourceGid: true,
        processed: true,
        error: true,
        receivedAt: true,
      },
    }),
  ]);

  // Task stats
  const totalIncomplete = projects.reduce((sum, p) => sum + p.tasks.length, 0);
  const totalProjects = projects.length;
  const standupCount = members.filter(m => m.inStandup).length;

  return (
    <WorkBoard
      projects={projects.map(p => ({
        asanaGid: p.asanaGid,
        name: p.name,
        color: p.color,
        syncedAt: p.syncedAt ? p.syncedAt.toISOString() : null,
        tasks: p.tasks.map(t => ({
          id: t.id,
          asanaGid: t.asanaGid,
          projectGid: t.projectGid,
          name: t.name,
          notes: t.notes,
          assigneeGid: t.assigneeGid,
          assigneeName: t.assigneeName,
          status: t.status,
          completedAt: t.completedAt ? t.completedAt.toISOString() : null,
          dueOn: t.dueOn,
          sectionName: t.sectionName,
          parentGid: t.parentGid,
          permalink: t.permalink,
          isModifiedByBot: t.isModifiedByBot,
          updatedAt: t.updatedAt.toISOString(),
        })),
      }))}
      members={members.map(m => ({
        asanaGid: m.asanaGid,
        name: m.name,
        email: m.email,
        inStandup: m.inStandup,
        syncedAt: m.syncedAt ? m.syncedAt.toISOString() : null,
      }))}
      recentEvents={recentEvents.map(e => ({
        id: e.id,
        eventType: e.eventType,
        resourceGid: e.resourceGid,
        processed: e.processed,
        error: e.error,
        receivedAt: e.receivedAt.toISOString(),
      }))}
      stats={{ totalIncomplete, totalProjects, standupCount }}
    />
  );
}
