import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { THEMES, RND_TRACKS, RISK_REGISTER } from "@/lib/roadmapData";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { stripMarkdown } from "@/lib/text";

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

// POST /api/roadmap/ceo-update — generate a weekly CTO→CEO strategic update
export async function POST() {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);

    // Pull live task state across all tracked projects
    const projects = await db.asanaProject.findMany({
      where: { isTracked: true },
      select: {
        name: true,
        tasks: {
          where: { parentGid: null },
          select: { name: true, status: true, sectionName: true, assigneeName: true, dueOn: true, completedAt: true },
        },
      },
    });

    const completedThisWeek: string[] = [];
    const inFlight: string[] = [];
    const overdue: string[] = [];
    const todayStr = now.toISOString().slice(0, 10);

    for (const p of projects) {
      for (const t of p.tasks) {
        if (t.status === "complete" && t.completedAt && new Date(t.completedAt) >= weekAgo) {
          completedThisWeek.push(`[${p.name}] ${t.name}`);
        } else if (t.status === "incomplete") {
          const sec = (t.sectionName ?? "").toLowerCase();
          if (sec.includes("progress") || sec === "wip") {
            inFlight.push(`[${p.name}] ${t.name}${t.assigneeName ? ` (${t.assigneeName})` : ""}`);
          }
          if (t.dueOn && t.dueOn < todayStr) {
            overdue.push(`[${p.name}] ${t.name} — due ${t.dueOn}`);
          }
        }
      }
    }

    // Theme structure (strategic frame)
    const themeLines = THEMES.map(t => {
      const nowItems = t.now.map(i => i.label).join("; ");
      return `- ${t.name} [${t.status}, ${t.tier}] — ${t.objective} | Now: ${nowItems}`;
    }).join("\n");

    const rndLines = RND_TRACKS.map(r => `- ${r.name} (${r.stage}): ${r.what}`).join("\n");

    const techContext = loadKnowledge("rian-tech.md");
    const bizContext  = loadKnowledge("rian-business.md");

    const cap = (arr: string[], n: number) => arr.slice(0, n).join("\n") || "(none)";

    const prompt = `You are Adwait Natekar, Tech Lead / CTO at Rian.io (an AI-human hybrid media localization company). Write a concise, professional WEEKLY engineering update for the CEO (Rian). This is a CTO→CEO update — strategic and outcome-focused, not a task dump. Adwait will read or paste this to brief the CEO.

Date: ${now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}

LIVE ASANA DATA (last 7 days):

COMPLETED THIS WEEK:
${cap(completedThisWeek, 25)}

IN FLIGHT (active dev — WIP / In Progress):
${cap(inFlight, 20)}

OVERDUE:
${cap(overdue, 15)}

STRATEGIC THEMES (current roadmap):
${themeLines}

R&D PIPELINE:
${rndLines}

KNOWN RISKS — High: ${RISK_REGISTER.high.join("; ")}

FORMATTING RULES (strict):
- PLAIN TEXT ONLY. Do NOT use any markdown: no asterisks (** or *), no hash headers (#), no horizontal rules (---), no backticks.
- Write section headers as plain uppercase words on their own line (e.g. "HEADLINE", "SHIPPED THIS WEEK").
- Use a simple hyphen "- " for bullets. To emphasize a label inside a bullet, just write it followed by a colon (e.g. "STS Editor v25.5: ...") — never wrap it in asterisks.
- No emoji. No em dashes (use a comma, colon, or period instead) — Rian's house style avoids them.
- Separate sections with a single blank line, not a divider line.

Write the update in this structure:

HEADLINE
One or two sentences: the single most important thing the CEO should know this week.

SHIPPED THIS WEEK
3-6 bullets of what actually landed (group by product/theme, translate ticket names into outcomes a CEO cares about — value delivered, not jargon). If little shipped, be honest and say so briefly.

IN PROGRESS
3-5 bullets on what is actively being built right now and roughly where it stands, tied to the two strategic bets (Self-Serve Launch, Website Live Translation) and the flagship STS tool.

RISKS & BLOCKERS
2-4 bullets — what is overdue or at risk, and what (if anything) you need from the CEO. Be direct.

NEXT WEEK
2-4 bullets on the focus for the coming week.

Keep it tight — a busy CEO should read it in under a minute. Reference real Rian context (the Recipe Method, STS tool, self-serve launch, the website translation demo) accurately. Do not invent metrics that aren't supported by the data above.

---
RIAN TECH CONTEXT:
${techContext.slice(0, 3000)}

RIAN BUSINESS CONTEXT:
${bizContext.slice(0, 1500)}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1400,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (response.content[0] as { text: string }).text.trim();
    const update = stripMarkdown(raw);

    return NextResponse.json({
      ok: true,
      update,
      stats: {
        completed: completedThisWeek.length,
        inFlight: inFlight.length,
        overdue: overdue.length,
      },
    });
  } catch (e) {
    console.error("CEO update generation error:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
