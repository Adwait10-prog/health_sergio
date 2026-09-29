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
import { patchDailyLog } from "../wa/store";
import { createAsanaTaskFromWhatsApp, resolveProject, PROJECT_NAMES } from "../asanaWhatsapp";

const HABITS = ["read", "meditate", "code", "learn", "network", "journal"] as const;
const HABIT_FIELD: Record<(typeof HABITS)[number], string> = {
  read: "didRead", meditate: "didMeditate", code: "didCode", learn: "didLearn", network: "didNetwork", journal: "didJournal",
};

function voiceCtx(): Ctx {
  return { userId: getUserId(), today: todayIST(), from: "voice", sid: "voice", text: "", reply: async () => {} };
}

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
  {
    name: "log_checkin",
    description: "Log today's check-in into his daily log: mood, energy, stress (1-10), sleep hours, water litres, and habits done (read, meditate, code, learn, network, journal). Pass only what he actually said; leave the rest empty/0. Workouts come from Strava automatically.",
    params: {
      mood: { type: "integer", description: "Mood 1-10, or 0 if not said" },
      energy: { type: "integer", description: "Energy 1-10, or 0 if not said" },
      stress: { type: "integer", description: "Stress 1-10, or 0 if not said" },
      sleep_hours: { type: "number", description: "Hours slept last night, or 0 if not said" },
      water_litres: { type: "number", description: "Litres of water today, or 0 if not said" },
      habits: { type: "string", description: "Comma-separated habits done today from: read, meditate, code, learn, network, journal. Empty if none." },
    },
    write: true,
    run: async (a) => {
      const n = (v: unknown, max: number) => { const x = Number(v); return x > 0 && x <= max ? x : undefined; };
      const fields: Record<string, unknown> = {
        moodScore: n(a.mood, 10), energyLevel: n(a.energy, 10), stressLevel: n(a.stress, 10),
        sleepMin: n(a.sleep_hours, 16) ? Math.round(Number(a.sleep_hours) * 60) : undefined,
        waterL: n(a.water_litres, 10),
      };
      const habits = str(a.habits).toLowerCase().split(/[,\s]+/).filter((h): h is (typeof HABITS)[number] => (HABITS as readonly string[]).includes(h));
      for (const h of habits) fields[HABIT_FIELD[h]] = true;
      const saved = Object.entries(fields).filter(([, v]) => v !== undefined);
      if (!saved.length) return "Nothing to log — ask what he wants recorded.";
      await patchDailyLog(voiceCtx(), Object.fromEntries(saved));
      const said = [
        fields.moodScore && `mood ${fields.moodScore}`, fields.energyLevel && `energy ${fields.energyLevel}`,
        fields.stressLevel && `stress ${fields.stressLevel}`, fields.sleepMin && `sleep ${Number(a.sleep_hours)} h`,
        fields.waterL && `water ${fields.waterL} L`, habits.length && `habits: ${habits.join(", ")}`,
      ].filter(Boolean);
      return `Logged ${said.join("; ")}.`;
    },
  },
  {
    name: "create_asana_task",
    description: `Create a real Asana task for his team. Needs a project; projects: ${Object.values(PROJECT_NAMES).join(", ")}. If he didn't name a project, ask which one before calling. Section (e.g. WIP, Backlog, Exploring) and assignee are optional.`,
    params: {
      description: { type: "string", description: "What the task is, with all the detail he gave, verbatim" },
      title: { type: "string", description: "Short task title if he gave one, else empty" },
      project: { type: "string", description: "Project name" },
      section: { type: "string", description: "Section/column if named, else empty" },
      assignee: { type: "string", description: "Person's name if he said who, else empty" },
    },
    required: ["description", "project"],
    write: true,
    run: async (a) => {
      if (!resolveProject(str(a.project) || null)) {
        return `No project matches "${str(a.project)}". Ask him which: ${Object.values(PROJECT_NAMES).join(", ")}.`;
      }
      const res = await createAsanaTaskFromWhatsApp({
        taskTitle: str(a.title) || null, taskDescription: str(a.description), projectHint: str(a.project),
        sectionHint: str(a.section) || null, assigneeHint: str(a.assignee) || null, phone: "voice", skipPendingCheck: true,
      });
      return res.message;
    },
  },
  {
    name: "reschedule_session",
    description: "Move or swap a half-marathon training session between days, e.g. 'do tomorrow's run today' (from tomorrow to today) or 'move Wednesday's run to Friday'.",
    params: {
      from_day: { type: "string", enum: ["today", "tomorrow", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"], description: "Day the session is on now" },
      to_day: { type: "string", enum: ["today", "tomorrow", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"], description: "Day to move it to" },
    },
    required: ["from_day", "to_day"],
    write: true,
    run: (a) => viaIntent("reschedule_session", { fromDay: str(a.from_day), toDay: str(a.to_day) }),
  },
  {
    name: "skip_session",
    description: "Skip a training session (mark it as rest).",
    params: {
      day: { type: "string", enum: ["today", "tomorrow", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"], description: "Which day's session" },
      reason: { type: "string", description: "Why, if he said; else empty" },
    },
    required: ["day"],
    write: true,
    run: (a) => viaIntent("skip_session", { day: str(a.day) || "today", reason: str(a.reason) || null }),
  },
];

export const TOOL_BY_NAME = new Map(AGENT_TOOLS.map(t => [t.name, t]));

// Client tools run in the browser (the Jarvis panel), not on the server
export const CLIENT_TOOLS: { name: string; description: string; params: Record<string, Prop>; required: string[]; expectsResponse?: boolean }[] = [
  {
    name: "navigate",
    description: "Open a page of his OS on screen when he asks to see or open something.",
    params: { page: { type: "string", enum: ["today", "os", "fitness", "technical", "work", "founder", "finance", "reflection", "meetings"], description: "Which page" } },
    required: ["page"],
  },
  {
    name: "read_screen",
    description: "Read what's on his screen right now (the page he has open). Use when he says 'this', 'what am I looking at', or asks about something on the page.",
    params: {},
    required: [],
    expectsResponse: true,
  },
  {
    name: "refresh_view",
    description: "Refresh the page on screen. Call after any change you make (logging, tasks, journal, EoD, three) so he sees it.",
    params: {},
    required: [],
  },
];
