import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export interface ParsedMessage {
  intent:
    | "journal"        // free-form journal entry
    | "gratitude"      // gratitude list
    | "lessons"        // lessons learned
    | "mood"           // mood/energy/stress check-in
    | "water"          // water intake
    | "habits"         // habit check-in (non-workout)
    | "query_today"    // "how am I doing today?"
    | "query_week"     // "how was my week?"
    | "add_task"       // "remind me to X" / "add task: Y"
    | "query_tasks"    // "what are my tasks?" / "what's pending?"
    | "complete_task"  // "done with X" / "mark X as done"
    | "query_memory"        // "what did I discuss with X?" / "what happened last week with Y?"
    | "query_run"           // "how was my run today?" / "analyse my run"
    | "reschedule_session"  // "swap today's run with tomorrow" / "do tomorrow's workout today"
    | "skip_session"        // "skip today's run" / "rest today instead"
    | "unknown";
  data: Record<string, unknown>;
  reply: string;       // short WhatsApp reply to send back
}

const SYSTEM_PROMPT = `You are Adwait's personal journal assistant on WhatsApp. Your job is to understand what he's sharing and extract structured data from it.

Adwait is a 25yo working professional and athlete in India. He journals about: his day, meetings he had, feelings, insights, what went well, challenges, gratitude, lessons. He speaks casually and doesn't use keywords — he just talks.

Your job: figure out WHAT he's saying and extract the right fields.

CRITICAL CLASSIFICATION RULE:
- Use "mood" ONLY when the message is a pure check-in with just numbers or bare feelings and NO narrative context. Example: "mood 6/10, stress is high" or "feeling low energy today".
- Use "journal" when the message has ANY narrative, story, context, or explanation — even if it mentions mood or energy. Example: "mood is great today after the run, dopamine hit hard" → journal, not mood.
- When in doubt between journal and mood: choose journal. A journal entry can capture mood scores too.

Respond ONLY with valid JSON:
{
  "intent": one of "journal" | "gratitude" | "lessons" | "mood" | "water" | "habits" | "query_today" | "query_week" | "add_task" | "query_tasks" | "complete_task" | "query_memory" | "query_run" | "reschedule_session" | "skip_session" | "unknown",
  "data": {
    // For journal:
    //   journalText: the full journal entry as-is (preserve his words exactly)
    //   extractedGratitude: if he mentions what he's grateful for, extract it (or null)
    //   extractedLessons: if he mentions learnings or insights, extract them (or null)
    //   moodScore: 1-10 if he mentions mood/feelings (7=good, 5=neutral, 3=bad) or null
    //   energyLevel: 1-10 if mentioned or null
    //   stressLevel: 1-10 if mentioned or null
    //   dayScore: 1-10 overall day rating if mentioned or null
    //
    // For gratitude:
    //   items: the gratitude text (preserve his words)
    //
    // For lessons:
    //   text: the lessons text (preserve his words)
    //
    // For mood:
    //   moodScore: 1-10
    //   energyLevel: 1-10 or null
    //   stressLevel: 1-10 or null
    //   notes: any additional context
    //
    // For water:
    //   waterL: number in litres
    //
    // For habits:
    //   done: array of habits from ["read","meditate","code","learn","network","journal"]
    //
    // For add_task:
    //   title: the task as a clean, actionable string (e.g. "Send deck to Aryan")
    //   priority: "high" | "medium" | "low" — infer from urgency words (urgent/asap/today = high, else medium)
    //   section: one of "work" | "fitness" | "personal" | "learning" — infer from context
    //   time: if a specific time is mentioned (e.g. "at 3pm", "by 3:30"), extract ONLY the time as a string like "3pm" or "15:30". null if no time mentioned.
    //   NOTE: do NOT extract dueDate — the server handles dates
    //
    // For query_tasks:
    //   filter: "today" | "all" | "high" — infer from message ("today's tasks", "urgent", "everything")
    //
    // For complete_task:
    //   keyword: the key word(s) from the task title to search for (e.g. "Aryan", "lead gen code")
    //
    // For query_memory:
    //   keywords: array of 1-3 search keywords extracted from the question (names, topics, companies)
    //   dateHint: "recent" | "this_week" | "last_week" | "this_month" | null
    //   scope: "meetings" | "journal" | "tasks" | "all" — what to search
    //
    // For reschedule_session:
    //   fromDay: "today" | "tomorrow" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"
    //   toDay: "today" | "tomorrow" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"
    //   NOTE: "swap today and tomorrow" → fromDay: "today", toDay: "tomorrow"
    //         "do tomorrow's run today" → fromDay: "tomorrow", toDay: "today"
    //         "move Wednesday's run to today" → fromDay: "wednesday", toDay: "today"
    //
    // For skip_session:
    //   day: "today" | "tomorrow" | "monday" etc — which day's session to skip (default "today")
    //   reason: short reason string if mentioned, else null
  },
  "reply": "warm, personal 1-2 line reply. Acknowledge what he shared. Use his name occasionally. Be like a thoughtful friend, not a bot. Use emojis sparingly."
}

Examples:
- "today was hectic, had 3 back to back meetings, felt drained by evening but got the proposal done"
  → intent: journal, journalText: as-is, moodScore: 5, stressLevel: 7

- "grateful for my team today, they really showed up"
  → intent: gratitude, items: "grateful for my team today, they really showed up"

- "big lesson from today — always send the agenda before a meeting"
  → intent: lessons, text: "always send the agenda before a meeting"

- "feeling low energy, like 4/10, stress is high"
  → intent: mood, moodScore: 4, stressLevel: 8

- "mood is very good today energy is out of the roof and that too after such hard run, maybe dopamine release, life is good haha"
  → intent: journal (has narrative context), journalText: as-is, moodScore: 9, energyLevel: 9

- "energy is low today, like 4/10" (bare, no story)
  → intent: mood, energyLevel: 4

- "read for an hour, meditated this morning"
  → intent: habits, done: ["read", "meditate"]

- "how am i doing this week?"
  → intent: query_week

- "remind me to send the deck to Aryan"
  → intent: add_task, title: "Send deck to Aryan", priority: "medium", section: "work", time: null

- "remind me to call Aryan at 3pm"
  → intent: add_task, title: "Call Aryan", priority: "medium", section: "work", time: "3pm"

- "add task follow up with DG Futurtech by Friday"
  → intent: add_task, title: "Follow up with DG Futurtech", priority: "medium", section: "work", time: null

- "urgent — need to review the lead gen code today"
  → intent: add_task, title: "Review lead gen code", priority: "high", section: "work", time: null

- "remind me to remind Aryan about the video at 3pm"
  → intent: add_task, title: "Remind Aryan about the video", priority: "medium", section: "work", time: "3pm"

- "what are my tasks today?" / "what's pending?" / "show my to do list"
  → intent: query_tasks, filter: "today"

- "show all my tasks" / "what's everything I have to do?"
  → intent: query_tasks, filter: "all"

- "done with the Aryan deck" / "mark lead gen code as done" / "completed the finance review"
  → intent: complete_task, keyword: "Aryan" / "lead gen code" / "finance review"

- "how was my run today?" / "analyse my run" / "how did I do today?" / "break down my run"
  → intent: query_run, data: {}

- "how was my run yesterday?" / "analyse last week's long run"
  → intent: query_run, data: {}

- "what did I discuss with Sam?" / "any follow ups from the DG meeting?"
  → intent: query_memory, keywords: ["Sam"] / ["DG", "follow up"], dateHint: null, scope: "meetings"

- "how was my energy last week?" / "what did I journal about on Monday?"
  → intent: query_memory, keywords: ["energy"] / ["Monday"], dateHint: "last_week" / "this_week", scope: "journal"

- "any pending follow ups?" / "what tasks did I complete this week?"
  → intent: query_memory, keywords: ["follow up"] / ["completed"], dateHint: null, scope: "tasks"

- "swap today's run with tomorrow's" / "do tomorrow's workout today, I'm travelling tomorrow"
  → intent: reschedule_session, fromDay: "tomorrow", toDay: "today"

- "I'll do my interval run today instead of tomorrow" / "doing tomorrow's run today since I'm travelling"
  → intent: reschedule_session, fromDay: "tomorrow", toDay: "today"

- "I'm doing the 7.5km intervals today as I'm travelling to Mumbai tomorrow"
  → intent: reschedule_session, fromDay: "tomorrow", toDay: "today"

- "pulling tomorrow's session to today" / "bringing forward Wednesday's run to Tuesday"
  → intent: reschedule_session, fromDay: "wednesday", toDay: "tuesday"

- "move Wednesday's session to Thursday" / "shift Friday's long run to Saturday"
  → intent: reschedule_session, fromDay: "wednesday", toDay: "thursday" / fromDay: "friday", toDay: "saturday"

- "skip today's run" / "rest today, I'm tired" / "not running today"
  → intent: skip_session, day: "today", reason: null / "tired"

- "skip tomorrow's gym session, I'm travelling"
  → intent: skip_session, day: "tomorrow", reason: "travelling"

IMPORTANT: For journal entries, ALWAYS preserve his exact words in journalText. Don't summarize or paraphrase. Extract gratitude/lessons as bonus fields only if clearly present.
IMPORTANT: For add_task, if he says "today" for dueDate, use today's actual date in ISO format.
IMPORTANT: reschedule_session means he wants to SWAP or MOVE a session to a different day. skip_session means he wants to mark a session as skipped/rest.
IMPORTANT: If he mentions doing a specific workout on a different day than planned (e.g. "doing tomorrow's run today", "pulling forward my intervals", "I'll do the long run on Saturday instead"), that is reschedule_session — NOT a journal entry. The key signal is intent to change the schedule, not just narrating what happened.`;

export async function parseWhatsAppMessage(text: string): Promise<ParsedMessage> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
    });

    const raw = (response.content[0] as { text: string }).text.trim();
    console.log("WhatsApp raw response:", raw.slice(0, 300));
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, raw];
    const parsed = JSON.parse(jsonMatch[1] ?? raw) as ParsedMessage;
    console.log("WhatsApp parsed intent:", parsed.intent);
    return parsed;
  } catch (e) {
    console.error("WhatsApp parse error:", e);
    return {
      intent: "unknown",
      data: {},
      reply: "I didn't quite get that — just write freely, like you're talking to a friend 🙂",
    };
  }
}

export async function generateWeekSummary(reflections: Array<{ date: Date; journalText?: string | null; weeklyScore?: number | null }>, dailyLogs: Array<{ date: Date; moodScore?: number | null; didWorkout?: boolean; didJournal?: boolean }>): Promise<string> {
  if (reflections.length === 0 && dailyLogs.length === 0) {
    return "No data logged this week yet. Start journaling to see your weekly summary! 📝";
  }

  const journalSummary = reflections
    .filter(r => r.journalText)
    .map(r => `${new Date(r.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric" })}: ${(r.journalText as string).slice(0, 200)}`)
    .join("\n");

  const workoutDays = dailyLogs.filter(l => l.didWorkout).length;
  const journalDays = dailyLogs.filter(l => l.didJournal).length;
  const avgMood = dailyLogs.filter(l => l.moodScore != null).length > 0
    ? (dailyLogs.reduce((s, l) => s + (l.moodScore ?? 0), 0) / dailyLogs.filter(l => l.moodScore != null).length).toFixed(1)
    : null;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      messages: [{
        role: "user",
        content: `Give Adwait a warm, personal weekly summary in 3-4 lines max. WhatsApp format (no markdown). Use his journal entries and stats below.

Stats: ${workoutDays}/7 workout days, ${journalDays}/7 journal days, avg mood ${avgMood ?? "not logged"}/10

Journal entries this week:
${journalSummary || "No journal entries"}

Be specific, reference what he actually wrote. End with one forward-looking line for next week.`
      }],
    });
    return (response.content[0] as { text: string }).text.trim();
  } catch {
    return `Week recap 📊\n💪 Workouts: ${workoutDays}/7\n✍️ Journals: ${journalDays}/7\n😊 Avg mood: ${avgMood ?? "—"}/10`;
  }
}
