// The EoD composer: reads today's real activity and drafts the outcome-first update for the Rian group.
import Anthropic from "@anthropic-ai/sdk";
import { addDays, subDays } from "date-fns";
import { db } from "./db";
import { OS } from "./osData";
import { stripMarkdown } from "./text";
import { ASANA_OWNER_GID } from "./user";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export const EOD_STREAMS = ["v2", "separation", "research", "box", "partnership", "corporate", "money", "delivery", "tooling"] as const;
export type EodStream = (typeof EOD_STREAMS)[number];

export interface TodayActivity {
  tasksDone: string[];
  tasksAdded: string[];
  asanaCompleted: string[];
  asanaNew: string[];
  meetings: string[];
  journal: string | null;
  techLog: string | null;
  three: string | null;
  yesterdayNext: string | null;
}

export interface ComposedEod {
  outcome: string;
  draft: string;
  streams: EodStream[];
}

// `today` is midnight IST as UTC; the window is that IST day.
export async function fetchTodayActivity(userId: string, today: Date): Promise<TodayActivity> {
  const tomorrow = addDays(today, 1);
  const inToday = { gte: today, lt: tomorrow };

  const [done, added, asanaDone, asanaNew, meetings, reflection, tech, three, yesterdayEod] = await Promise.all([
    db.task.findMany({ where: { userId, doneAt: inToday }, select: { title: true } }),
    db.task.findMany({ where: { userId, createdAt: inToday, status: { not: "done" } }, select: { title: true } }),
    db.asanaTask.findMany({
      where: { assigneeGid: ASANA_OWNER_GID, parentGid: null, completedAt: inToday },
      select: { name: true, project: { select: { name: true } } }, take: 12,
    }),
    db.asanaTask.findMany({
      where: { assigneeGid: ASANA_OWNER_GID, parentGid: null, status: "incomplete", createdAt: inToday },
      select: { name: true, project: { select: { name: true } } }, take: 8,
    }),
    db.meetingNote.findMany({ where: { userId, date: today }, select: { title: true, summary: true, decisions: true } }),
    db.reflection.findFirst({ where: { userId, date: today, type: "daily" }, select: { journalText: true } }),
    db.technicalLog.findFirst({ where: { userId, date: today } }),
    db.osNote.findUnique({ where: { key: "three" } }),
    db.eodUpdate.findUnique({ where: { date: subDays(today, 1) }, select: { draft: true, final: true } }),
  ]);

  const techLog = tech
    ? Object.entries(tech)
        .filter(([k, v]) => typeof v === "number" && v > 0 && !["id"].includes(k))
        .map(([k, v]) => `${k}: ${v}`)
        .concat(tech.notes ? [`notes: ${tech.notes}`] : [])
        .join(", ") || null
    : null;

  const prev = yesterdayEod?.final ?? yesterdayEod?.draft ?? "";
  const yesterdayNext = prev.split("\n").find(l => /^next\s*:/i.test(l.trim()))?.trim() ?? null;

  return {
    tasksDone: done.map(t => t.title),
    tasksAdded: added.map(t => t.title),
    asanaCompleted: asanaDone.map(t => `${t.name}${t.project?.name ? ` (${t.project.name})` : ""}`),
    asanaNew: asanaNew.map(t => `${t.name}${t.project?.name ? ` (${t.project.name})` : ""}`),
    meetings: meetings.map(m => [m.title, m.summary, m.decisions && `decided: ${m.decisions}`].filter(Boolean).join(" | ")),
    journal: reflection?.journalText ?? null,
    techLog,
    three: three?.text?.trim() || null,
    yesterdayNext,
  };
}

const list = (xs: string[]) => (xs.length ? xs.map(x => `- ${x}`).join("\n") : "(none)");

export async function composeEod(activity: TodayActivity, notes: string | null): Promise<ComposedEod> {
  const prompt = `You write Adwait Natekar's end-of-day update for the Rian group chat (Anand, the founders and the team read it daily). Adwait is Tech Lead / CTO at Rian.io.

The update must read as OWNERSHIP OF OUTCOMES, not a list of tools touched.

FORMAT (exactly this shape, plain text):
${OS.eod.template}

RULES
- Line 2 is the outcome: the single most important result today, with a number or a name, and who it helps or unblocks.
- Only use numbers, names and facts that appear in the material below. Never invent a metric. If there is no number, lead with the concrete result and the person or team it unblocked.
- Never add detail that isn't in the material: don't describe what a fix enables, don't guess at impact. If the material is thin, write fewer bullets (one is fine) rather than padding.
- 1 to 4 "what moved" bullets, each a result, not an activity.
- If something went wrong, state the bad thing and its fix in one sentence as one of the bullets.
- Last line starts with "Next:" and says where things will be by tomorrow or Monday.
- Five to seven lines total. No markdown, no asterisks, no headers other than "Updates —". Avoid em dashes anywhere except that first line.

STYLE REFERENCE (outcome first):
Reliance output unblocked, 90 min/day sustained, zero open blockers.
- v2 download feature shipped
- ElevenLabs brief sent to Anand
- formant-EQ accent approach confirmed for Mowgli-type work
Next: batch monitor screen reviewed with Saijash by Monday.

Coaching note on what good looks like: ${OS.eod.note}

WHAT ADWAIT SAID ABOUT TODAY
${notes?.trim() || "(nothing extra, draft from the activity below)"}

TODAY'S ACTIVITY (from his systems)
Tasks completed:
${list(activity.tasksDone)}
Asana tickets completed:
${list(activity.asanaCompleted)}
New Asana tickets assigned to him:
${list(activity.asanaNew)}
Meetings:
${list(activity.meetings)}
Tasks added today (not done):
${list(activity.tasksAdded)}
Technical log: ${activity.techLog ?? "(none)"}
Today's three (what he planned last night): ${activity.three ?? "(none)"}
Journal today: ${activity.journal ? activity.journal.slice(0, 1200) : "(none)"}
Yesterday's "Next:" line (say whether it landed, if relevant): ${activity.yesterdayNext ?? "(none)"}

STREAMS (tag every stream today's work touched, only from this list):
v2 = v2 dubbing tool bugs/features for Rohit's production team · separation = media platform separation build/cutover · research = model or tool evaluation · box = Box automation / intake agent · partnership = ElevenLabs and other partners · corporate = corporate sales numbers, demos · money = follow-the-money, finance, cost per minute · delivery = delivery corrections · tooling = internal dashboards, bots, CRM

Respond ONLY with JSON:
{"outcome": "<line 2 only>", "draft": "<the full update, newlines as \\n>", "streams": ["v2", ...]}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 700,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = (response.content[0] as { text: string }).text.trim();
  let parsed: Partial<ComposedEod> = {};
  try {
    const body = raw.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    parsed = JSON.parse(body);
  } catch {
    parsed = { draft: raw }; // model ignored the JSON instruction: keep the text
  }

  const draft = stripMarkdown(parsed.draft ?? raw, { keepEmDash: true });
  const outcome = stripMarkdown(
    parsed.outcome ?? draft.split("\n").map(l => l.trim()).find(l => l && !/^updates\b/i.test(l)) ?? draft,
    { keepEmDash: true },
  );
  const streams = (Array.isArray(parsed.streams) ? parsed.streams : [])
    .filter((s): s is EodStream => (EOD_STREAMS as readonly string[]).includes(s as string));

  return { outcome, draft, streams };
}
