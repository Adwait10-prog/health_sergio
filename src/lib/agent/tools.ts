// Jarvis tools — one list drives both the ElevenAgents tool config (scripts/agent-setup.ts)
// and the webhook that runs them (/api/agent/tool/[name]).
// Most tools reuse the WhatsApp intent handlers through a context that captures replies,
// so voice and WhatsApp share one implementation.
import { db } from "../db";
import { getUserId } from "../user";
import { todayIST as todayKey } from "../date";
import { handlers } from "../wa/intents";
import { todayIST, type Ctx } from "../wa/context";
import type { ParsedMessage } from "../whatsapp";
import { buildBriefing } from "./briefing";

type Prop = { type: "string" | "number" | "boolean" | "integer"; description: string; enum?: string[] };
type Args = Record<string, unknown>;

export interface AgentTool {
  name: string;
  description: string;
  params: Record<string, Prop>;
  required?: string[];
  write?: boolean; // changes data (the prompt asks Jarvis to refresh the view after these)
  run: (args: Args) => Promise<string>;
}

// Run a WhatsApp intent handler and return what it would have sent
async function viaIntent(intent: ParsedMessage["intent"], data: Args, text = ""): Promise<string> {
  const out: string[] = [];
  const ctx: Ctx = {
    userId: getUserId(),
    today: todayIST(),
    from: "voice",
    sid: `voice-${intent}`,
    text,
    reply: async (m: string) => { out.push(m); },
  };
  await handlers[intent](ctx, { intent, data, reply: "" });
  return out.join("\n\n") || "Done.";
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export const AGENT_TOOLS: AgentTool[] = [
  // ── Read ──
  {
    name: "get_briefing",
    description: "Fresh snapshot of right now: mode and rules, the five numbers, today's three, EoD status, today's training, tasks, work in progress, countdowns, recovery. Use when the briefing you started with may be stale (after changes) or he asks 'where are we'.",
    params: {},
    run: async () => (await buildBriefing()).briefing,
  },
  {
    name: "query_week",
    description: "Summary of the last 7 days: journal themes, mood, workouts, journaling streak.",
    params: {},
    run: () => viaIntent("query_week", {}),
  },
  {
    name: "query_run",
    description: "Analysis of his most recent run from Strava: distance, pace, heart rate, how it compares.",
    params: {},
    run: () => viaIntent("query_run", {}, "how was my run"),
  },
  {
    name: "query_tasks",
    description: "His personal task list.",
    params: { filter: { type: "string", enum: ["today", "all"], description: "'today' for today's tasks, 'all' for everything open" } },
    run: (a) => viaIntent("query_tasks", { filter: str(a.filter) || "today" }),
  },
  {
    name: "search_memory",
    description: "Search his meeting notes, journal and tasks for past events: 'what did I discuss with X', 'when did I last feel like this', 'what happened last week with Y'.",
    params: {
      question: { type: "string", description: "His question, verbatim" },
      keywords: { type: "string", description: "1-3 search keywords, comma-separated (names, topics, companies)" },
      scope: { type: "string", enum: ["meetings", "journal", "tasks", "all"], description: "Where to look" },
      date_hint: { type: "string", enum: ["recent", "this_week", "last_week", "this_month", "none"], description: "Time window, or 'none'" },
    },
    required: ["question", "keywords"],
    run: (a) => viaIntent("query_memory", {
      keywords: str(a.keywords).split(",").map(s => s.trim()).filter(Boolean),
      scope: str(a.scope) || "all",
      dateHint: str(a.date_hint) && str(a.date_hint) !== "none" ? str(a.date_hint) : null,
    }, str(a.question)),
  },

  // ── Write ──
  {
    name: "log_metric",
    description: "Log one of the numbers: reliance (Reliance output, minutes per day), demos (demos sent this week), ferritin (blood test, ng/mL).",
    params: {
      key: { type: "string", enum: ["reliance", "demos", "ferritin"], description: "Which number" },
      value: { type: "number", description: "The value" },
    },
    required: ["key", "value"],
    write: true,
    run: (a) => viaIntent("log_metric", { key: str(a.key), value: Number(a.value) }),
  },
  {
    name: "add_task",
    description: "Add a personal task (not Asana).",
    params: {
      title: { type: "string", description: "Clean, actionable task title" },
      priority: { type: "string", enum: ["high", "medium", "low"], description: "Priority, default medium" },
      section: { type: "string", enum: ["work", "personal", "fitness", "finance", "learning"], description: "Area, default work" },
      time: { type: "string", description: "Time if he gave one, e.g. '3pm', else empty" },
    },
    required: ["title"],
    write: true,
    run: (a) => viaIntent("add_task", { title: str(a.title), priority: str(a.priority) || "medium", section: str(a.section) || "work", time: str(a.time) || null }),
  },
  {
    name: "complete_task",
    description: "Mark one of his tasks done.",
    params: { keyword: { type: "string", description: "Word(s) from the task title" } },
    required: ["keyword"],
    write: true,
    run: (a) => viaIntent("complete_task", { keyword: str(a.keyword) }),
  },
  {
    name: "save_journal",
    description: "Save something he wants remembered in today's journal (thoughts, how the day went, lessons, gratitude). Appends, never overwrites.",
    params: {
      text: { type: "string", description: "What to save, in his words, first person" },
      mood_score: { type: "integer", description: "Mood 1-10 only if he stated one, else 0" },
    },
    required: ["text"],
    write: true,
    run: (a) => viaIntent("journal", { journalText: str(a.text), moodScore: Number(a.mood_score) > 0 ? Number(a.mood_score) : null }),
  },
  {
    name: "draft_eod",
    description: "Compose today's end-of-day update (outcome first) from today's activity plus anything he says, and save it as today's EoD.",
    params: { notes: { type: "string", description: "What he says he did or shipped today, verbatim; empty if none" } },
    write: true,
    run: (a) => viaIntent("draft_eod", { notes: str(a.notes) || null }),
  },
  {
    name: "set_three",
    description: "Set today's three (his three priorities). Replaces the current three.",
    params: {
      first: { type: "string", description: "Priority 1" },
      second: { type: "string", description: "Priority 2" },
      third: { type: "string", description: "Priority 3" },
    },
    required: ["first"],
    write: true,
    run: async (a) => {
      const lines = [a.first, a.second, a.third].map(str).filter(Boolean);
      await db.osNote.upsert({ where: { key: "three" }, create: { key: "three", text: lines.join("\n") }, update: { text: lines.join("\n") } });
      return `Today's three set: ${lines.map((l, i) => `${i + 1}. ${l}`).join("; ")}`;
    },
  },
  {
    name: "tick_three",
    description: "Tick (or untick) one of today's three as done.",
    params: {
      number: { type: "integer", description: "1, 2 or 3" },
      done: { type: "boolean", description: "true to tick, false to untick" },
    },
    required: ["number"],
    write: true,
    run: async (a) => {
      const n = Number(a.number);
      if (![1, 2, 3].includes(n)) return "Which one — 1, 2 or 3?";
      const done = a.done !== false;
      const listKey = `three:${todayKey()}`;
      await db.osChecklistItem.upsert({
        where: { listKey_itemId: { listKey, itemId: String(n - 1) } },
        create: { listKey, itemId: String(n - 1), done },
        update: { done },
      });
      return `Number ${n} ${done ? "ticked" : "unticked"}.`;
    },
  },
];

export const TOOL_BY_NAME = new Map(AGENT_TOOLS.map(t => [t.name, t]));

// Client tools run in the browser (the Jarvis panel), not on the server
export const CLIENT_TOOLS: { name: string; description: string; params: Record<string, Prop>; required: string[] }[] = [
  {
    name: "navigate",
    description: "Open a page of his OS on screen when he asks to see or open something.",
    params: { page: { type: "string", enum: ["today", "os", "fitness", "technical", "work", "founder", "finance", "reflection", "meetings"], description: "Which page" } },
    required: ["page"],
  },
  {
    name: "refresh_view",
    description: "Refresh the page on screen. Call after any change you make (logging, tasks, journal, EoD, three) so he sees it.",
    params: {},
    required: [],
  },
];
