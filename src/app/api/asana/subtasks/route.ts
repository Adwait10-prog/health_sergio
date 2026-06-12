import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSubtask, addComment } from "@/lib/asana";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// The core team to distribute subtasks among
// Vishal resolved dynamically from DB; others hardcoded
const CORE_TEAM_NAMES = ["Adwait Natekar", "Nikhil", "Saijash Padicharayil", "Vishal"];

function loadKnowledge(...filenames: string[]): string {
  return filenames
    .map(fn => {
      try {
        return fs.readFileSync(path.join(process.cwd(), "src/lib/knowledge", fn), "utf-8");
      } catch { return ""; }
    })
    .filter(Boolean)
    .join("\n\n---\n\n");
}

interface SubtaskSpec {
  title: string;
  description: string;
  assignee: string; // name — will be resolved to GID
  rationale: string;
}

// POST /api/asana/subtasks
// Body: { taskGid: string }
export async function POST(req: NextRequest) {
  try {
    const { taskGid } = await req.json() as { taskGid: string };
    if (!taskGid) return NextResponse.json({ ok: false, error: "taskGid required" }, { status: 400 });

    // Load task from DB
    const task = await db.asanaTask.findUnique({ where: { asanaGid: taskGid } });
    if (!task) return NextResponse.json({ ok: false, error: "Task not found in DB — sync first" }, { status: 404 });

    // Load team members from DB for GID resolution
    const allMembers = await db.asanaMember.findMany();

    // Resolve core team to { name, gid } — skip if not found
    const teamWithGids = CORE_TEAM_NAMES.map(targetName => {
      const member = allMembers.find(m =>
        m.name.toLowerCase().includes(targetName.toLowerCase().split(" ")[0]) ||
        targetName.toLowerCase().includes(m.name.toLowerCase().split(" ")[0])
      );
      return { name: targetName, gid: member?.asanaGid ?? null };
    });

    const techContext  = loadKnowledge("rian-tech.md");
    const bizContext   = loadKnowledge("rian-business.md");

    const teamList = teamWithGids.map(t => `- ${t.name}${t.gid ? "" : " (not yet in Asana)"}`).join("\n");

    const prompt = `You are the AI PM assistant for Rian.io. Break down this Asana task into concrete subtasks and assign each to the right person.

PARENT TASK: "${task.name}"
DESCRIPTION:
${(task.notes ?? "(no description)").slice(0, 2000)}

TEAM (assign subtasks only to these people):
${teamList}

Team roles:
- Adwait Natekar: founder / product / backend / overall ownership
- Nikhil: frontend / UI development
- Saijash Padicharayil: backend / API / infrastructure
- Vishal: design / creative / marketing assets (if not in Asana yet, assign to Adwait)

Generate 3-6 subtasks that together complete this parent task. Each subtask should be:
- Independently completable (no hidden dependencies between them unless necessary)
- Assigned to the most appropriate person based on their role
- Specific and actionable (not vague like "fix it" or "review")

Respond ONLY with valid JSON array:
[
  {
    "title": "short actionable subtask title (verb + noun, max 8 words)",
    "description": "1-2 sentences: what specifically needs to be done and what done looks like",
    "assignee": "exact name from the team list above",
    "rationale": "one phrase: why this person"
  }
]

---
RIAN TECHNICAL CONTEXT:
${techContext.slice(0, 4000)}

RIAN BUSINESS CONTEXT:
${bizContext.slice(0, 1500)}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (response.content[0] as { text: string }).text.trim();

    // Parse JSON — strip markdown fences if present
    const jsonStr = raw.replace(/^```json\s*/m, "").replace(/^```\s*/m, "").replace(/```\s*$/m, "").trim();
    const subtaskSpecs: SubtaskSpec[] = JSON.parse(jsonStr);

    // Create subtasks in Asana
    const created: Array<{ title: string; assignee: string; asanaGid: string }> = [];

    for (const spec of subtaskSpecs) {
      // Resolve assignee GID
      const teamMember = teamWithGids.find(t =>
        t.name.toLowerCase().includes(spec.assignee.toLowerCase().split(" ")[0]) ||
        spec.assignee.toLowerCase().includes(t.name.toLowerCase().split(" ")[0])
      );

      // If Vishal not found, fall back to Adwait
      const assigneeGid = teamMember?.gid
        ?? teamWithGids.find(t => t.name === "Adwait Natekar")?.gid
        ?? null;

      const assigneeName = teamMember?.gid ? spec.assignee : "Adwait Natekar (Vishal fallback)";

      const subtask = await createSubtask(taskGid, {
        name: spec.title,
        notes: `${spec.description}\n\n_Auto-generated subtask — assign reviewed before starting._`,
        assigneeGid: assigneeGid ?? undefined,
      });

      // Save to DB
      await db.asanaTask.upsert({
        where: { asanaGid: subtask.gid },
        create: {
          asanaGid: subtask.gid,
          projectGid: task.projectGid,
          name: spec.title,
          notes: spec.description,
          assigneeGid,
          assigneeName,
          status: "incomplete",
          parentGid: taskGid,
          isModifiedByBot: true,
          permalink: subtask.permalink_url ?? null,
        },
        update: {
          name: spec.title,
          notes: spec.description,
          assigneeGid,
          assigneeName,
          isModifiedByBot: true,
        },
      });

      created.push({ title: spec.title, assignee: assigneeName, asanaGid: subtask.gid });
    }

    // Add a summary comment to the parent task
    const summaryLines = created.map(s => `• ${s.title} → ${s.assignee}`).join("\n");
    await addComment(taskGid, `🤖 Subtasks auto-generated by Rian AI Bot:\n\n${summaryLines}\n\nReview assignments before starting.`);

    return NextResponse.json({ ok: true, subtasks: created });
  } catch (e) {
    console.error("Subtask generation error:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
