import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";
import { subDays, format } from "date-fns";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

function todayIST(): Date {
  const now = new Date();
  const istMs = now.getTime() + 5.5 * 60 * 60 * 1000;
  const dateStr = new Date(istMs).toISOString().split("T")[0];
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - 5.5 * 60 * 60 * 1000);
}

interface MemoryQueryParams {
  keywords: string[];
  dateHint: "recent" | "this_week" | "last_week" | "this_month" | null;
  scope: "meetings" | "journal" | "tasks" | "all";
  originalQuestion: string;
}

export async function queryMemory(params: MemoryQueryParams): Promise<string> {
  const userId = getUserId();
  const today = todayIST();

  // Date range from hint
  const dateFrom = (() => {
    switch (params.dateHint) {
      case "this_week":  return subDays(today, 7);
      case "last_week":  return subDays(today, 14);
      case "this_month": return subDays(today, 30);
      case "recent":     return subDays(today, 14);
      default:           return subDays(today, 60); // default: last 2 months
    }
  })();

  const keywords = params.keywords.map(k => k.toLowerCase());

  // Helper: check if text contains any keyword
  const matches = (text: string | null) =>
    !text ? false : keywords.some(k => text.toLowerCase().includes(k));

  // Fetch relevant data based on scope — always pre-filter, never dump all
  const contextParts: string[] = [];

  if (params.scope === "meetings" || params.scope === "all") {
    const meetings = await db.meetingNote.findMany({
      where: { userId, date: { gte: dateFrom } },
      orderBy: { date: "desc" },
      take: 20,
      select: { date: true, title: true, attendees: true, summary: true, decisions: true, actionItems: true },
    });

    const relevant = meetings.filter(m =>
      keywords.length === 0 ||
      matches(m.title) || matches(m.attendees) ||
      matches(m.summary) || matches(m.decisions) || matches(m.actionItems)
    );

    if (relevant.length > 0) {
      contextParts.push("MEETING NOTES:\n" + relevant.slice(0, 5).map(m =>
        `[${format(new Date(m.date), "d MMM")}] ${m.title}` +
        (m.attendees ? ` (with ${m.attendees})` : "") +
        (m.summary   ? `\nSummary: ${m.summary.slice(0, 200)}` : "") +
        (m.decisions ? `\nDecisions: ${m.decisions.slice(0, 150)}` : "") +
        (m.actionItems ? `\nActions: ${m.actionItems.slice(0, 150)}` : "")
      ).join("\n\n"));
    }
  }

  if (params.scope === "journal" || params.scope === "all") {
    const reflections = await db.reflection.findMany({
      where: { userId, type: "daily", date: { gte: dateFrom } },
      orderBy: { date: "desc" },
      take: 30,
      select: { date: true, journalText: true, lessonsLearned: true },
    });

    const relevant = reflections.filter(r =>
      keywords.length === 0 ||
      matches(r.journalText as string) || matches(r.lessonsLearned as string)
    );

    if (relevant.length > 0) {
      contextParts.push("JOURNAL ENTRIES:\n" + relevant.slice(0, 7).map(r =>
        `[${format(new Date(r.date), "d MMM")}] ${(r.journalText as string ?? "").slice(0, 250)}` +
        (r.lessonsLearned ? `\nLesson: ${(r.lessonsLearned as string).slice(0, 100)}` : "")
      ).join("\n\n"));
    }
  }

  if (params.scope === "tasks" || params.scope === "all") {
    const tasks = await db.task.findMany({
      where: {
        userId,
        updatedAt: { gte: dateFrom },
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: { title: true, status: true, priority: true, doneAt: true, createdAt: true },
    });

    const relevant = tasks.filter(t =>
      keywords.length === 0 || matches(t.title)
    );

    if (relevant.length > 0) {
      const open = relevant.filter(t => t.status !== "done");
      const done = relevant.filter(t => t.status === "done");

      let taskSection = "TASKS:\n";
      if (open.length) taskSection += `Open: ${open.map(t => t.title).join(", ")}\n`;
      if (done.length) taskSection += `Completed: ${done.map(t => t.title).join(", ")}`;
      contextParts.push(taskSection.trim());
    }
  }

  // No relevant data found
  if (contextParts.length === 0) {
    const scopeLabel = params.scope === "all" ? "journals, meetings, or tasks" : params.scope;
    return `Nothing found in your ${scopeLabel} matching "${params.keywords.join(", ")}" in the last ${params.dateHint === "this_week" ? "week" : "2 months"}.`;
  }

  // Build tight context — cap at ~1500 chars
  let context = contextParts.join("\n\n");
  if (context.length > 1500) context = context.slice(0, 1500) + "...";

  // Ask Claude to answer the question from context
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 300,
    messages: [{
      role: "user",
      content: `Answer Adwait's question using only the data below. Be specific, reference actual details. Max 4 lines. No markdown. WhatsApp format.

Question: "${params.originalQuestion}"

Data:
${context}`,
    }],
  });

  return (response.content[0] as { text: string }).text.trim();
}
