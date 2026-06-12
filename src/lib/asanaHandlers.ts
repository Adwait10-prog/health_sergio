import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import {
  getTask,
  updateTaskDescription,
  addComment,
  AsanaTaskData,
} from "@/lib/asana";
import fs from "fs";
import path from "path";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// ── Knowledge base loader ──────────────────────────────────────────────────

function loadKnowledge(...filenames: string[]): string {
  return filenames
    .map((fn) => {
      try {
        return fs.readFileSync(
          path.join(process.cwd(), "src/lib/knowledge", fn),
          "utf-8"
        );
      } catch {
        return "";
      }
    })
    .filter(Boolean)
    .join("\n\n---\n\n");
}

// ── Main event dispatcher ──────────────────────────────────────────────────

export async function processAsanaEvent(event: {
  action: string;
  resource: { gid: string; resource_type: string };
  parent?: { gid: string; resource_type: string } | null;
  project?: { gid: string } | null;
}) {
  const { action, resource } = event;

  // Only process task events
  if (resource.resource_type !== "task") return;

  const task = await getTask(resource.gid);

  // Sync task to DB
  await syncTaskToDB(task);

  if (action === "added") {
    await handleTaskCreated(task);
  } else if (action === "changed") {
    await handleTaskChanged(task);
  }
}

// ── DB sync ────────────────────────────────────────────────────────────────

async function syncTaskToDB(task: AsanaTaskData) {
  const projectGid = task.projects[0]?.gid ?? null;
  const sectionName = task.memberships[0]?.section?.name ?? null;

  await db.asanaTask.upsert({
    where: { asanaGid: task.gid },
    create: {
      asanaGid: task.gid,
      projectGid,
      name: task.name,
      notes: task.notes ?? null,
      assigneeGid: task.assignee?.gid ?? null,
      assigneeName: task.assignee?.name ?? null,
      status: task.completed ? "complete" : "incomplete",
      completedAt: task.completed_at ? new Date(task.completed_at) : null,
      dueOn: task.due_on ?? null,
      sectionName,
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
      sectionName,
      syncedAt: new Date(),
    },
  });
}

// ── Handler: Task Created ──────────────────────────────────────────────────

async function handleTaskCreated(task: AsanaTaskData) {
  console.log(`Asana: task created — "${task.name}"`);

  // Auto ticket writer: expand thin descriptions
  const noteLength = (task.notes ?? "").trim().length;
  if (noteLength < 80) {
    await runTicketWriter(task);
  }

  // Effort suggester: always comment with estimate
  await runEffortSuggester(task);
}

// ── Handler: Task Changed ──────────────────────────────────────────────────

async function handleTaskChanged(task: AsanaTaskData) {
  console.log(`Asana: task changed — "${task.name}" section=${task.memberships[0]?.section?.name}`);

  const section = task.memberships[0]?.section?.name ?? "";

  // Quality checker: fires when moved to "Ready for Dev" section
  if (
    section.toLowerCase().includes("ready for dev") ||
    section.toLowerCase().includes("ready to dev") ||
    section.toLowerCase().includes("in review")
  ) {
    await runQualityChecker(task);
  }
}

// ── Auto Ticket Writer ─────────────────────────────────────────────────────

async function runTicketWriter(task: AsanaTaskData) {
  console.log(`Ticket writer: expanding "${task.name}"`);

  // Don't re-expand if bot already wrote it
  const existing = await db.asanaTask.findUnique({ where: { asanaGid: task.gid } });
  if (existing?.isModifiedByBot) return;

  const techContext = loadKnowledge("rian-tech.md");
  const businessContext = loadKnowledge("rian-business.md");

  const prompt = `You are the AI PM assistant for Rian.io. A new Asana task was just created with a vague or missing description. Expand it into a proper engineering ticket.

TASK NAME: "${task.name}"
CURRENT DESCRIPTION: "${(task.notes ?? "").trim() || "(empty)"}"
ASSIGNEE: ${task.assignee?.name ?? "unassigned"}

Write a complete ticket description in this exact format:

## Background
[What the problem is and why it matters — 2-3 sentences max]

## Current Behaviour
[What is happening now, or what is missing]

## Expected Behaviour
[What should happen after this is implemented]

## Acceptance Criteria
- [ ] [specific, testable criterion]
- [ ] [specific, testable criterion]
- [ ] [specific, testable criterion]

## Notes for Dev
[Relevant files, endpoints, edge cases, or Rian-specific context]

Use the Rian technical and business context below to write accurate, specific acceptance criteria. Reference actual endpoint names, field names, or components where relevant. Be concise — no fluff.

---
RIAN TECHNICAL CONTEXT:
${techContext.slice(0, 6000)}

RIAN BUSINESS CONTEXT:
${businessContext.slice(0, 2000)}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  const expanded = (response.content[0] as { text: string }).text.trim();

  // Write back to Asana
  await updateTaskDescription(task.gid, expanded);

  // Mark as bot-modified in DB
  await db.asanaTask.update({
    where: { asanaGid: task.gid },
    data: { notes: expanded, isModifiedByBot: true },
  });

  // Add a comment noting the expansion
  await addComment(
    task.gid,
    `🤖 Description auto-expanded by Rian AI Bot based on task name. Please review and edit if needed.`
  );

  console.log(`Ticket writer: done for "${task.name}"`);
}

// ── Quality Checker ────────────────────────────────────────────────────────

async function runQualityChecker(task: AsanaTaskData) {
  console.log(`Quality checker: checking "${task.name}"`);

  const missing: string[] = [];

  if (!task.notes || task.notes.trim().length < 50) missing.push("description");
  if (!task.notes?.toLowerCase().includes("acceptance criteria") &&
      !task.notes?.toLowerCase().includes("- [ ]")) missing.push("acceptance criteria");
  if (!task.assignee) missing.push("assignee");
  if (!task.due_on) missing.push("due date");

  if (missing.length === 0) return; // all good

  const assigneeName = task.assignee?.name ?? "team";
  const missingList = missing.join(", ");

  await addComment(
    task.gid,
    `⚠️ Hey ${assigneeName} — this ticket is missing: **${missingList}**. Please add these before it gets picked up for development.`
  );

  console.log(`Quality checker: flagged missing [${missingList}] on "${task.name}"`);
}

// ── Effort Suggester ───────────────────────────────────────────────────────

async function runEffortSuggester(task: AsanaTaskData) {
  console.log(`Effort suggester: estimating "${task.name}"`);

  const techContext = loadKnowledge("rian-tech.md");

  const prompt = `You are the AI PM assistant for Rian.io. Estimate the effort for this engineering task.

TASK NAME: "${task.name}"
DESCRIPTION: "${(task.notes ?? "").slice(0, 500) || "(empty)"}"

Respond in this exact format (nothing else):
SIZE: [Small / Medium / Large]
DAYS: [0.5-1 / 2-3 / 4-5]
REASON: [one sentence explaining why]

Size guide:
- Small (0.5–1 day): UI tweak, small bug fix, config change, single endpoint
- Medium (2–3 days): New feature with backend + frontend, moderate integration work
- Large (4–5 days): Complex feature, multiple systems, external API, or unclear requirements

RIAN TECHNICAL CONTEXT (for reference):
${techContext.slice(0, 3000)}`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 150,
    messages: [{ role: "user", content: prompt }],
  });

  const estimate = (response.content[0] as { text: string }).text.trim();

  // Parse the structured response
  const sizeMatch = estimate.match(/SIZE:\s*(.+)/i);
  const daysMatch = estimate.match(/DAYS:\s*(.+)/i);
  const reasonMatch = estimate.match(/REASON:\s*(.+)/i);

  if (!sizeMatch) return;

  const size = sizeMatch[1].trim();
  const days = daysMatch?.[1].trim() ?? "?";
  const reason = reasonMatch?.[1].trim() ?? "";

  await addComment(
    task.gid,
    `📊 Effort estimate: **${size}** (~${days} days)\n${reason}\n\n_Automated estimate — adjust if needed._`
  );

  console.log(`Effort suggester: ${size} for "${task.name}"`);
}

// ── Standup Data ───────────────────────────────────────────────────────────

export interface StandupEntry {
  memberName: string;
  completed: AsanaTaskData[];
  inProgress: AsanaTaskData[];
}

export async function fetchStandupData(): Promise<StandupEntry[]> {
  // Get members who are in standup
  const members = await db.asanaMember.findMany({
    where: { inStandup: true },
  });

  if (members.length === 0) return [];

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const entries: StandupEntry[] = [];

  for (const member of members) {
    // Completed yesterday
    const completed = await db.asanaTask.findMany({
      where: {
        assigneeGid: member.asanaGid,
        status: "complete",
        completedAt: { gte: yesterday, lt: today },
      },
    });

    // In progress (incomplete, assigned)
    const inProgress = await db.asanaTask.findMany({
      where: {
        assigneeGid: member.asanaGid,
        status: "incomplete",
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });

    entries.push({
      memberName: member.name,
      completed: completed as unknown as AsanaTaskData[],
      inProgress: inProgress as unknown as AsanaTaskData[],
    });
  }

  return entries;
}

// ── Format standup for WhatsApp morning brief ──────────────────────────────

export function formatStandupForBrief(entries: StandupEntry[]): string {
  if (entries.length === 0) return "";

  const lines: string[] = ["── Team Standup ──"];

  for (const entry of entries) {
    lines.push(`\n${entry.memberName}`);
    if (entry.completed.length > 0) {
      lines.push(`✅ Done: ${entry.completed.map((t) => t.name).join(", ")}`);
    } else {
      lines.push(`✅ Done: nothing completed yesterday`);
    }
    if (entry.inProgress.length > 0) {
      lines.push(`🔄 Today: ${entry.inProgress.slice(0, 3).map((t) => t.name).join(", ")}`);
    }
  }

  return lines.join("\n");
}
