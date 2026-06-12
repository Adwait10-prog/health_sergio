import { db } from "@/lib/db";
import InsightsBoard from "@/components/work/InsightsBoard";

export const dynamic = "force-dynamic";

// ── Types passed to client ─────────────────────────────────────────────────

export interface AssigneeRow {
  name: string;
  asanaGid: string | null;
  openCount: number;
  overdueCount: number;
  avgAgeDays: number;
}

export interface ProjectRow {
  asanaGid: string;
  name: string;
  color: string | null;
  openCount: number;
  overdueCount: number;
  completedLast7Days: number;
  totalTasks: number;
}

export interface BotStats {
  ticketsExpanded: number;
  eventsProcessed: number;
  eventsErrored: number;
}

export interface InsightsData {
  assignees: AssigneeRow[];
  projects: ProjectRow[];
  botStats: BotStats;
  unassignedCount: number;
  generatedAt: string;
}

// ── Page ──────────────────────────────────────────────────────────────────

export default async function WorkInsightsPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    incompleteTasks,
    completedTasks,
    allProjects,
    allMembers,
    botModifiedCount,
    eventsProcessedCount,
    eventsErroredCount,
  ] = await Promise.all([
    db.asanaTask.findMany({
      where: { status: "incomplete" },
      select: {
        asanaGid: true,
        assigneeGid: true,
        assigneeName: true,
        dueOn: true,
        createdAt: true,
        projectGid: true,
      },
    }),
    db.asanaTask.findMany({
      where: {
        status: "complete",
        completedAt: { gte: sevenDaysAgo },
      },
      select: {
        asanaGid: true,
        projectGid: true,
        completedAt: true,
        createdAt: true,
      },
    }),
    db.asanaProject.findMany({
      select: { asanaGid: true, name: true, color: true },
    }),
    db.asanaMember.findMany({
      select: { asanaGid: true, name: true },
    }),
    db.asanaTask.count({ where: { isModifiedByBot: true } }),
    db.asanaWebhookEvent.count({ where: { processed: true } }),
    db.asanaWebhookEvent.count({
      where: { error: { not: null } },
    }),
  ]);

  const todayStr = today.toISOString().slice(0, 10);

  // ── Per-assignee stats ────────────────────────────────────────────────

  const assigneeMap = new Map<
    string,
    { name: string; asanaGid: string | null; tasks: { dueOn: string | null; createdAt: Date }[] }
  >();

  let unassignedTasks: { dueOn: string | null; createdAt: Date }[] = [];

  for (const task of incompleteTasks) {
    if (!task.assigneeName) {
      unassignedTasks.push({ dueOn: task.dueOn, createdAt: task.createdAt });
      continue;
    }
    const key = task.assigneeGid ?? task.assigneeName;
    const existing = assigneeMap.get(key);
    if (existing) {
      existing.tasks.push({ dueOn: task.dueOn, createdAt: task.createdAt });
    } else {
      assigneeMap.set(key, {
        name: task.assigneeName,
        asanaGid: task.assigneeGid,
        tasks: [{ dueOn: task.dueOn, createdAt: task.createdAt }],
      });
    }
  }

  // Merge member names — prefer DB member records
  const membersByGid = new Map(allMembers.map(m => [m.asanaGid, m.name]));

  const assignees: AssigneeRow[] = Array.from(assigneeMap.values()).map(a => {
    const name = (a.asanaGid && membersByGid.get(a.asanaGid)) ?? a.name;
    const openCount = a.tasks.length;
    const overdueCount = a.tasks.filter(t => t.dueOn && t.dueOn < todayStr).length;
    const totalAgeDays = a.tasks.reduce((sum, t) => {
      const ageDays = (today.getTime() - new Date(t.createdAt).getTime()) / 86_400_000;
      return sum + ageDays;
    }, 0);
    const avgAgeDays = openCount > 0 ? Math.round(totalAgeDays / openCount) : 0;
    return { name, asanaGid: a.asanaGid, openCount, overdueCount, avgAgeDays };
  });

  assignees.sort((a, b) => b.openCount - a.openCount);

  const unassignedCount = unassignedTasks.length;

  // ── Per-project stats ─────────────────────────────────────────────────

  // Count completed tasks in last 7 days per project
  const completedByProject = new Map<string, number>();
  for (const t of completedTasks) {
    if (!t.projectGid) continue;
    completedByProject.set(t.projectGid, (completedByProject.get(t.projectGid) ?? 0) + 1);
  }

  // Count open tasks per project
  const openByProject = new Map<string, { open: number; overdue: number }>();
  for (const task of incompleteTasks) {
    if (!task.projectGid) continue;
    const existing = openByProject.get(task.projectGid) ?? { open: 0, overdue: 0 };
    existing.open += 1;
    if (task.dueOn && task.dueOn < todayStr) existing.overdue += 1;
    openByProject.set(task.projectGid, existing);
  }

  const projects: ProjectRow[] = allProjects.map(p => {
    const open = openByProject.get(p.asanaGid) ?? { open: 0, overdue: 0 };
    const completedLast7Days = completedByProject.get(p.asanaGid) ?? 0;
    const totalTasks = open.open + completedLast7Days;
    return {
      asanaGid: p.asanaGid,
      name: p.name,
      color: p.color,
      openCount: open.open,
      overdueCount: open.overdue,
      completedLast7Days,
      totalTasks,
    };
  });

  projects.sort((a, b) => b.openCount - a.openCount);

  const data: InsightsData = {
    assignees,
    projects,
    botStats: {
      ticketsExpanded: botModifiedCount,
      eventsProcessed: eventsProcessedCount,
      eventsErrored: eventsErroredCount,
    },
    unassignedCount,
    generatedAt: new Date().toISOString(),
  };

  return <InsightsBoard data={data} />;
}
