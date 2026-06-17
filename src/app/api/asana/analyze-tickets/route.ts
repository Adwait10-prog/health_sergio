import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTaskComments } from "@/lib/asana";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

function loadKnowledge(...filenames: string[]): string {
  return filenames
    .map(fn => {
      try { return fs.readFileSync(path.join(process.cwd(), "src/lib/knowledge", fn), "utf-8"); }
      catch { return ""; }
    })
    .filter(Boolean)
    .join("\n\n---\n\n");
}

export interface TicketAnalysis {
  taskGid: string;
  name: string;
  isTechProblem: "yes" | "partial" | "no";
  techVerdict: string;        // one-line: why it is / isn't an engineering problem
  automationOpportunity: "high" | "medium" | "low" | "none";
  automationIdea: string;     // concrete automation suggestion, or why none
  recommendation: string;     // what Adwait / a developer should actually do
}

// POST /api/asana/analyze-tickets
// Body: { taskGids: string[] }  — analyze a specific set of Media Squad tickets
export async function POST(req: NextRequest) {
  try {
    const { taskGids } = await req.json() as { taskGids: string[] };
    if (!taskGids?.length) {
      return NextResponse.json({ ok: false, error: "taskGids required" }, { status: 400 });
    }

    // Load tickets + their comments
    const tasks = await db.asanaTask.findMany({ where: { asanaGid: { in: taskGids } } });
    if (!tasks.length) {
      return NextResponse.json({ ok: false, error: "No tickets found — sync first" }, { status: 404 });
    }

    const withComments = await Promise.all(
      tasks.map(async t => ({
        task: t,
        comments: await getTaskComments(t.asanaGid).catch(() => []),
      }))
    );

    const techContext = loadKnowledge("rian-tech.md");
    const bizContext  = loadKnowledge("rian-business.md");

    const ticketBlocks = withComments.map(({ task, comments }, i) => {
      const commentsText = comments.length
        ? comments.slice(-5).map(c => `   • [${c.created_by?.name ?? "?"}]: ${c.text.trim().slice(0, 200)}`).join("\n")
        : "   (no comments)";
      return `TICKET ${i + 1} [gid:${task.asanaGid}]
Name: ${task.name}
Section: ${task.sectionName ?? "—"} · Assignee: ${task.assigneeName ?? "unassigned"}
Description: ${(task.notes ?? "(none)").slice(0, 600)}
Recent comments:
${commentsText}`;
    }).join("\n\n");

    const prompt = `You are the Tech Lead / CTO advisor for Rian.io (a media localization company). Below are tickets from the **Media Squad** project (a mostly ops/sales/delivery board). For EACH ticket, assess two things honestly:

1. **Is it even a tech problem?** Many Media Squad tickets are process, sales, or people issues, NOT engineering. Be honest — do not invent engineering work where none exists. ("yes" = clearly an engineering task, "partial" = has a tech component but mostly ops, "no" = not engineering at all).

2. **Automation opportunity?** Could this manual/repetitive work be automated (script, pipeline, integration, bot)? Rate high/medium/low/none and give ONE concrete idea grounded in Rian's actual stack (AWS Lambda, .NET API, Asana, the Recipe/STS pipeline). If none, say why.

Then give a one-line **recommendation**: what should Adwait or a developer actually do — or explicitly "no engineering action; leave to ops".

TICKETS:
${ticketBlocks}

Respond ONLY with a valid JSON array, one object per ticket, in the same order:
[
  {
    "taskGid": "<the gid from [gid:...]>",
    "name": "<ticket name>",
    "isTechProblem": "yes" | "partial" | "no",
    "techVerdict": "one honest line on whether/why this is an engineering problem",
    "automationOpportunity": "high" | "medium" | "low" | "none",
    "automationIdea": "one concrete automation idea grounded in Rian's stack, or why none",
    "recommendation": "one line: what to actually do"
  }
]

---
RIAN TECH CONTEXT:
${techContext.slice(0, 3500)}

RIAN BUSINESS CONTEXT:
${bizContext.slice(0, 1500)}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (response.content[0] as { text: string }).text.trim();
    const jsonStr = raw.replace(/^```json\s*/m, "").replace(/^```\s*/m, "").replace(/```\s*$/m, "").trim();
    const analyses: TicketAnalysis[] = JSON.parse(jsonStr);

    return NextResponse.json({ ok: true, analyses });
  } catch (e) {
    console.error("Ticket analysis error:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
