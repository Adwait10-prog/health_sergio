import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { createTask, addComment } from "@/lib/asana";
import fs from "fs";
import path from "path";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// Rian's 7 Asana projects (kept in sync with DB)
const KNOWN_PROJECTS: Record<string, string> = {
  "core engineering":          "1213036075688995",
  "media squad":               "1213024317030114",
  "japan market entry":        "1213079508921410",
  "brand guidelines":          "1213079508921435",
  "brand guidelines & messaging": "1213079508921435",
  "updates":                   "1213096045295434",
  "recipe cloud":              "1213398562883432",
  "media rian":                "1215471459454088",
};

const PROJECT_NAMES: Record<string, string> = {
  "1213036075688995": "Core Engineering",
  "1213024317030114": "Media Squad",
  "1213079508921410": "Japan Market Entry",
  "1213079508921435": "Brand Guidelines & Messaging",
  "1213096045295434": "Updates",
  "1213398562883432": "Recipe Cloud",
  "1215471459454088": "Media Rian",
};

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

function resolveProject(hint: string | null): { gid: string; name: string } | null {
  if (!hint) return null;
  const normalized = hint.toLowerCase().trim();

  // Direct match
  for (const [key, gid] of Object.entries(KNOWN_PROJECTS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return { gid, name: PROJECT_NAMES[gid] };
    }
  }

  // Fuzzy: any word overlap
  const words = normalized.split(/\s+/);
  for (const [key, gid] of Object.entries(KNOWN_PROJECTS)) {
    if (words.some(w => w.length > 3 && key.includes(w))) {
      return { gid, name: PROJECT_NAMES[gid] };
    }
  }

  return null;
}

function resolveAssignee(hint: string | null): { gid: string; name: string } | null {
  if (!hint) return null;
  // Will be matched against DB members at call time
  return null; // placeholder — resolved below via DB
}

// Write a full Asana ticket using knowledge base
async function expandToFullTicket(taskDescription: string, projectName: string): Promise<{ title: string; body: string }> {
  const techContext  = loadKnowledge("rian-tech.md");
  const bizContext   = loadKnowledge("rian-business.md");
  const asanaContext = loadKnowledge("rian-asana-seed.md");

  const prompt = `You are the AI PM assistant for Rian.io. Adwait just described a task on WhatsApp. Turn it into a proper Asana ticket.

PROJECT: ${projectName}
TASK DESCRIPTION FROM ADWAIT: "${taskDescription}"

Write a complete ticket in this exact format:

TITLE: [concise, actionable task title — verb + noun, max 8 words]

## Background
[Why this matters, what problem it solves — 2 sentences max]

## Current Behaviour
[What is happening now or what is missing]

## Expected Behaviour
[What should happen after this task is done]

## Acceptance Criteria
- [ ] [specific, testable criterion]
- [ ] [specific, testable criterion]
- [ ] [specific, testable criterion]

## Notes for Dev
[Relevant files, endpoints, edge cases, Rian-specific context — be specific]

Use the context below to write accurate, specific acceptance criteria. Reference real endpoint names, field names, or components where you can. Be concise — no filler.

---
RIAN TECHNICAL CONTEXT:
${techContext.slice(0, 5000)}

RIAN BUSINESS CONTEXT:
${bizContext.slice(0, 2000)}

RECENT ASANA TASKS (for context on what's already done):
${asanaContext.slice(0, 2000)}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 900,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = (response.content[0] as { text: string }).text.trim();

  // Extract title from first line
  const titleMatch = raw.match(/^TITLE:\s*(.+)/m);
  const title = titleMatch ? titleMatch[1].trim() : taskDescription.slice(0, 60);
  const body = raw.replace(/^TITLE:\s*.+\n?/m, "").trim();

  return { title, body };
}

export async function createAsanaTaskFromWhatsApp(params: {
  taskDescription: string;
  projectHint: string | null;
  assigneeHint: string | null;
  phone: string;
  skipPendingCheck?: boolean;
}): Promise<{ message: string }> {
  const { taskDescription, projectHint, assigneeHint, phone, skipPendingCheck } = params;

  // Resolve project
  const project = resolveProject(projectHint);

  if (!project && !skipPendingCheck) {
    // Ask which project
    const projectList = Object.values(PROJECT_NAMES).join("\n• ");

    // Store pending action (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await db.whatsappPendingAction.upsert({
      where: { phone },
      create: {
        phone,
        action: "create_asana_task",
        payload: JSON.stringify({ taskDescription, assigneeHint }),
        expiresAt,
      },
      update: {
        action: "create_asana_task",
        payload: JSON.stringify({ taskDescription, assigneeHint }),
        expiresAt,
      },
    });

    return {
      message: `Got it! Which project should this go into?\n\n• ${projectList}\n\nJust reply with the project name.`,
    };
  }

  if (!project) {
    return { message: "Couldn't match a project — try again with the exact project name (e.g. 'Core Engineering')." };
  }

  // Resolve assignee from DB members if hint given
  let assigneeGid: string | null = null;
  let assigneeName: string | null = null;

  if (assigneeHint) {
    const members = await db.asanaMember.findMany();
    const hint = assigneeHint.toLowerCase();
    const match = members.find(m => m.name.toLowerCase().includes(hint) || hint.includes(m.name.toLowerCase().split(" ")[0]));
    if (match) {
      assigneeGid = match.asanaGid;
      assigneeName = match.name;
    }
  }

  // Expand to full ticket
  const { title, body } = await expandToFullTicket(taskDescription, project.name);

  // Create in Asana
  const task = await createTask({
    name: title,
    notes: body,
    projectGid: project.gid,
    assigneeGid: assigneeGid ?? undefined,
  });

  // Save to local DB
  await db.asanaTask.upsert({
    where: { asanaGid: task.gid },
    create: {
      asanaGid: task.gid,
      projectGid: project.gid,
      name: title,
      notes: body,
      assigneeGid,
      assigneeName,
      status: "incomplete",
      isModifiedByBot: true,
      permalink: task.permalink_url ?? null,
    },
    update: {
      name: title,
      notes: body,
      assigneeGid,
      assigneeName,
      isModifiedByBot: true,
    },
  });

  // Add bot comment
  await addComment(task.gid, `🤖 Ticket created via WhatsApp by Adwait. Description auto-expanded from: "${taskDescription.slice(0, 100)}"`);

  const assigneeNote = assigneeName ? ` · assigned to ${assigneeName}` : "";
  const link = task.permalink_url ? `\n${task.permalink_url}` : "";

  return {
    message: `✅ Asana ticket created in ${project.name}${assigneeNote}!\n\n"${title}"${link}\n\nBot wrote the full description using Rian context 🤖`,
  };
}
