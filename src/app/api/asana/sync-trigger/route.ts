import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getMe,
  getWorkspaceMembers,
  getProjects,
  getProjectTasks,
} from "@/lib/asana";

// POST /api/asana/sync-trigger — UI-callable sync (no auth needed, same logic as /api/asana/sync)
export async function POST() {
  try {
    const me = await getMe() as unknown as { gid: string; name: string; email: string; workspaces: { gid: string }[] };
    const workspaceGid = me.workspaces?.[0]?.gid;
    if (!workspaceGid) throw new Error("No workspace found");

    // ── Sync members ──────────────────────────────────────────────────────
    const members = await getWorkspaceMembers(workspaceGid);
    let memberCount = 0;
    for (const m of members) {
      await db.asanaMember.upsert({
        where: { asanaGid: m.gid },
        create: { asanaGid: m.gid, name: m.name, email: m.email ?? null, workspaceGid, inStandup: false },
        update: { name: m.name, email: m.email ?? null, syncedAt: new Date() },
      });
      memberCount++;
    }

    // ── Sync projects ─────────────────────────────────────────────────────
    const projects = await getProjects(workspaceGid);
    let projectCount = 0;
    for (const p of projects) {
      await db.asanaProject.upsert({
        where: { asanaGid: p.gid },
        create: { asanaGid: p.gid, name: p.name, color: p.color ?? null, workspaceGid, isTracked: true },
        update: { name: p.name, color: p.color ?? null, syncedAt: new Date() },
      });
      projectCount++;
    }

    // ── Sync tasks ────────────────────────────────────────────────────────
    let taskCount = 0;
    for (const project of projects) {
      const tasks = await getProjectTasks(project.gid);
      for (const task of tasks) {
        await db.asanaTask.upsert({
          where: { asanaGid: task.gid },
          create: {
            asanaGid: task.gid,
            projectGid: task.projects[0]?.gid ?? null,
            name: task.name,
            notes: task.notes ?? null,
            assigneeGid: task.assignee?.gid ?? null,
            assigneeName: task.assignee?.name ?? null,
            status: task.completed ? "complete" : "incomplete",
            completedAt: task.completed_at ? new Date(task.completed_at) : null,
            dueOn: task.due_on ?? null,
            sectionName: task.memberships[0]?.section?.name ?? null,
            parentGid: task.parent?.gid ?? null,
            permalink: task.permalink_url ?? null,
          },
          update: {
            name: task.name,
            notes: task.notes ?? null,
            assigneeGid: task.assignee?.gid ?? null,
            assigneeName: task.assignee?.name ?? null,
            status: task.completed ? "complete" : "incomplete",
            completedAt: task.completed_at ? new Date(task.completed_at) : null,
            dueOn: task.due_on ?? null,
            sectionName: task.memberships[0]?.section?.name ?? null,
            syncedAt: new Date(),
          },
        });
        taskCount++;
      }
    }

    return NextResponse.json({ ok: true, members: memberCount, projects: projectCount, tasks: taskCount });
  } catch (e) {
    console.error("Asana sync-trigger error:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
