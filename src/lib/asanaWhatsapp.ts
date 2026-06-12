import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { createTask, addComment, addTaskToSection, getProjectSections } from "@/lib/asana";
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

// Hardcoded section GIDs per project — avoids an extra API call per task creation
// Keys are lowercase section name variants the user might say
const SECTION_MAP: Record<string, Record<string, string>> = {
  "1213036075688995": { // Core Engineering
    "wip":                    "1213079362640979",
    "work in progress":       "1213079362640979",
    "backlog":                "1213589311041062",
    "exploring":              "1213036075688996",
    "planning":               "1213079362640978",
    "planning/scoping":       "1213079362640978",
    "scoping":                "1213079362640978",
    "prioritized":            "1213226456746426",
    "awaiting feedback":      "1213079362640980",
    "feedback":               "1213079362640980",
    "concluded":              "1213079362640981",
    "deprioritized":          "1215652667316105",
    "rnd":                    "1213830510117515",
    "r&d":                    "1213830510117515",
  },
  "1213024317030114": { // Media Squad
    "sales initiatives":      "1213226456746425",
    "sales":                  "1213226456746425",
    "exploring":              "1213024317030115",
    "planning":               "1213024318039385",
    "planning/scoping":       "1213024318039385",
    "scoping":                "1213024318039385",
    "prioritized":            "1213421137249399",
    "wip":                    "1213024318039386",
    "work in progress":       "1213024318039386",
    "feedback pending":       "1213036075688999",
    "feedback":               "1213036075688999",
    "done":                   "1213036075689000",
  },
  "1213398562883432": { // Recipe Cloud
    "rnd":                    "1213415418208869",
    "r&d":                    "1213415418208869",
    "exploration":            "1213398562883433",
    "exploring":              "1213398562883433",
    "in progress":            "1213398621660448",
    "wip":                    "1213398621660448",
    "work in progress":       "1213398621660448",
    "dev done":               "1213342695700896",
    "released for testing":   "1213342695700897",
    "testing":                "1213342695700897",
  },
  "1215471459454088": { // Media Rian
    "media sales & delivery": "1215471459454089",
    "media sales":            "1215471459454089",
    "sales":                  "1215471459454089",
    "international bd":       "1215475002580202",
    "international":          "1215475002580202",
    "india bd":               "1215529162726445",
    "india":                  "1215529162726445",
  },
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

// Resolve a section hint to a GID for a given project
async function resolveSection(
  projectGid: string,
  sectionHint: string | null
): Promise<{ gid: string; name: string } | null> {
  if (!sectionHint) return null;

  const normalized = sectionHint.toLowerCase().trim();
  const projectSections = SECTION_MAP[projectGid];

  if (projectSections) {
    // Try direct key match
    for (const [key, gid] of Object.entries(projectSections)) {
      if (normalized === key || normalized.includes(key) || key.includes(normalized)) {
        return { gid, name: key };
      }
    }
    // Fuzzy word match
    const words = normalized.split(/\s+/);
    for (const [key, gid] of Object.entries(projectSections)) {
      if (words.some(w => w.length > 2 && key.includes(w))) {
        return { gid, name: key };
      }
    }
  }

  // Fallback: fetch live from Asana
  try {
    const liveSections = await getProjectSections(projectGid);
    const match = liveSections.find(s => {
      const sName = s.name.toLowerCase();
      return sName.includes(normalized) || normalized.includes(sName);
    });
    return match ?? null;
  } catch {
    return null;
  }
}

// Write a full Asana ticket body using knowledge base
// If taskTitle is provided, skip title generation. If description is rich (>120 chars), do a light enhancement pass.
async function expandToFullTicket(
  taskDescription: string,
  projectName: string,
  providedTitle: string | null
): Promise<{ title: string; body: string }> {
  const techContext  = loadKnowledge("rian-tech.md");
  const bizContext   = loadKnowledge("rian-business.md");
  const asanaContext = loadKnowledge("rian-asana-seed.md");

  const isRich = taskDescription.trim().length >= 120;

  const titleInstruction = providedTitle
    ? `TITLE: ${providedTitle}
(This title was explicitly given by Adwait — use it as-is, do NOT change it.)`
    : `TITLE: [concise, actionable task title — verb + noun, max 8 words]`;

  const descriptionInstruction = isRich
    ? `Adwait's description is already detailed. Lightly structure it into the sections below — preserve his exact intent and wording as much as possible. Do not invent new requirements.`
    : `Adwait's description is brief. Expand it into a complete ticket using Rian context below. Reference real files, endpoints, and components where applicable.`;

  const prompt = `You are the AI PM assistant for Rian.io. Adwait just described a task on WhatsApp. Turn it into a proper Asana ticket.

PROJECT: ${projectName}
TASK DESCRIPTION FROM ADWAIT: "${taskDescription}"

${descriptionInstruction}

Write the ticket in this exact format:

${titleInstruction}

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
[Relevant files, endpoints, edge cases, Rian-specific context — be specific. Omit if not applicable.]

Use the context below to write accurate, specific acceptance criteria. Be concise — no filler.

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
  const title = titleMatch
    ? titleMatch[1].trim()
    : (providedTitle ?? taskDescription.slice(0, 60));
  const body = raw.replace(/^TITLE:\s*.+\n?/m, "").trim();

  return { title, body };
}

export async function createAsanaTaskFromWhatsApp(params: {
  taskTitle: string | null;
  taskDescription: string;
  projectHint: string | null;
  sectionHint: string | null;
  assigneeHint: string | null;
  phone: string;
  skipPendingCheck?: boolean;
}): Promise<{ message: string }> {
  const { taskTitle, taskDescription, projectHint, sectionHint, assigneeHint, phone, skipPendingCheck } = params;

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
        payload: JSON.stringify({ taskTitle, taskDescription, sectionHint, assigneeHint }),
        expiresAt,
      },
      update: {
        action: "create_asana_task",
        payload: JSON.stringify({ taskTitle, taskDescription, sectionHint, assigneeHint }),
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

  // Resolve section
  const section = await resolveSection(project.gid, sectionHint);

  // Resolve assignee from DB members if hint given
  let assigneeGid: string | null = null;
  let assigneeName: string | null = null;

  if (assigneeHint) {
    const members = await db.asanaMember.findMany();
    const hint = assigneeHint.toLowerCase();
    const match = members.find(m =>
      m.name.toLowerCase().includes(hint) || hint.includes(m.name.toLowerCase().split(" ")[0])
    );
    if (match) {
      assigneeGid = match.asanaGid;
      assigneeName = match.name;
    }
  }

  // Expand to full ticket (title preserved if explicitly given)
  const { title, body } = await expandToFullTicket(taskDescription, project.name, taskTitle ?? null);

  // Create in Asana
  const task = await createTask({
    name: title,
    notes: body,
    projectGid: project.gid,
    assigneeGid: assigneeGid ?? undefined,
  });

  // Place in section if resolved
  if (section) {
    try {
      await addTaskToSection(section.gid, task.gid);
    } catch (e) {
      console.warn("addTaskToSection failed (non-fatal):", e);
    }
  }

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
      sectionName: section ? section.name : null,
      isModifiedByBot: true,
      permalink: task.permalink_url ?? null,
    },
    update: {
      name: title,
      notes: body,
      assigneeGid,
      assigneeName,
      sectionName: section ? section.name : null,
      isModifiedByBot: true,
    },
  });

  // Add bot comment
  const descPreview = taskDescription.slice(0, 100);
  await addComment(
    task.gid,
    `🤖 Ticket created via WhatsApp by Adwait.\nOriginal description: "${descPreview}${taskDescription.length > 100 ? "…" : ""}"\nDescription ${taskDescription.trim().length >= 120 ? "structured" : "expanded"} by Rian AI Bot.`
  );

  const assigneeNote = assigneeName ? ` · assigned to ${assigneeName}` : "";
  const sectionNote  = section ? ` · placed in ${section.name}` : "";
  const link = task.permalink_url ? `\n${task.permalink_url}` : "";

  return {
    message: `✅ Asana ticket created in ${project.name}${sectionNote}${assigneeNote}!\n\n"${title}"${link}\n\nBot ${taskDescription.trim().length >= 120 ? "structured" : "expanded"} the description using Rian context 🤖`,
  };
}
