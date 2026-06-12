import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getMe,
  getWorkspaceMembers,
  getProjects,
  getProjectTasks,
} from "@/lib/asana";
import fs from "fs";
import path from "path";

// POST /api/asana/sync — one-time full sync of projects, tasks, members
// Also generates the rian-asana-seed.md knowledge file
// Protected by CRON_SECRET
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const me = await getMe() as unknown as { gid: string; name: string; email: string; workspaces: { gid: string }[] };
    const workspaceGid = me.workspaces?.[0]?.gid;
    if (!workspaceGid) throw new Error("No workspace found");

    console.log("Asana sync: workspace", workspaceGid);

    // ── Sync members ──────────────────────────────────────────────────────
    const members = await getWorkspaceMembers(workspaceGid);
    let memberCount = 0;
    for (const m of members) {
      await db.asanaMember.upsert({
        where: { asanaGid: m.gid },
        create: {
          asanaGid: m.gid,
          name: m.name,
          email: m.email ?? null,
          workspaceGid,
          inStandup: false,
        },
        update: {
          name: m.name,
          email: m.email ?? null,
          syncedAt: new Date(),
        },
      });
      memberCount++;
    }
    console.log(`Asana sync: ${memberCount} members synced`);

    // ── Sync projects ─────────────────────────────────────────────────────
    const projects = await getProjects(workspaceGid);
    let projectCount = 0;
    for (const p of projects) {
      await db.asanaProject.upsert({
        where: { asanaGid: p.gid },
        create: {
          asanaGid: p.gid,
          name: p.name,
          color: p.color ?? null,
          workspaceGid,
          isTracked: true,
        },
        update: {
          name: p.name,
          color: p.color ?? null,
          syncedAt: new Date(),
        },
      });
      projectCount++;
    }
    console.log(`Asana sync: ${projectCount} projects synced`);

    // ── Sync tasks + generate seed file ──────────────────────────────────
    const seedLines: string[] = [
      "# Rian.io — Asana Task History (Auto-generated seed)",
      `*Generated: ${new Date().toISOString()}*`,
      "",
      "This file contains all existing Asana tasks at the time of initial sync.",
      "Used as background context for the AI bot — not updated automatically after this.",
      "",
    ];

    let taskCount = 0;

    for (const project of projects) {
      console.log(`Asana sync: fetching tasks for project "${project.name}"`);
      const tasks = await getProjectTasks(project.gid);

      seedLines.push(`## Project: ${project.name}`);
      seedLines.push("");

      for (const task of tasks) {
        // Sync to DB
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

        // Add to seed file (only tasks with descriptions)
        if (task.notes && task.notes.trim().length > 20) {
          seedLines.push(`### ${task.name}`);
          seedLines.push(`- **Status:** ${task.completed ? "Completed" : "Incomplete"}`);
          if (task.assignee) seedLines.push(`- **Assignee:** ${task.assignee.name}`);
          if (task.due_on) seedLines.push(`- **Due:** ${task.due_on}`);
          if (task.memberships[0]?.section?.name) {
            seedLines.push(`- **Section:** ${task.memberships[0].section.name}`);
          }
          seedLines.push("");
          seedLines.push(task.notes.trim().slice(0, 500));
          seedLines.push("");
        } else {
          // Short task — just list it
          seedLines.push(
            `- **${task.name}** (${task.completed ? "done" : "open"}${task.assignee ? `, ${task.assignee.name}` : ""})`
          );
        }

        taskCount++;
      }

      seedLines.push("");
    }

    // Write seed file
    const seedPath = path.join(process.cwd(), "src/lib/knowledge/rian-asana-seed.md");
    fs.writeFileSync(seedPath, seedLines.join("\n"), "utf-8");
    console.log(`Asana sync: seed file written (${seedLines.length} lines)`);

    return NextResponse.json({
      ok: true,
      members: memberCount,
      projects: projectCount,
      tasks: taskCount,
      seedFile: "src/lib/knowledge/rian-asana-seed.md",
    });
  } catch (e) {
    console.error("Asana sync error:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
