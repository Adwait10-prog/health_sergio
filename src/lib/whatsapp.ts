import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export interface ParsedMessage {
  intent: "log_run" | "log_gym" | "log_habits" | "log_journal" | "log_water" | "log_mood" | "query_stats" | "query_today" | "unknown";
  data: Record<string, unknown>;
  reply: string;
}

const SYSTEM_PROMPT = `You are Adwait's personal OS assistant. Parse his WhatsApp messages and extract structured data for logging.

Adwait tracks: runs, gym sessions, habits (workout, read, journal, meditate, code, learn, network), mood (1-10), stress (1-10), water (litres), journal entries, and asks stats questions.

Respond ONLY with valid JSON in this exact format:
{
  "intent": one of: "log_run" | "log_gym" | "log_habits" | "log_journal" | "log_water" | "log_mood" | "query_stats" | "query_today" | "unknown",
  "data": {
    // For log_run: distanceKm, durationMin, avgHr, notes
    // For log_gym: sessionType ("legs"|"upper"|"full_body"), durationMin, notes
    // For log_habits: array of habits done e.g. ["workout","journal","code","read","meditate","network","learn"]
    // For log_journal: journalText, gratitude, lessons
    // For log_water: waterL (number)
    // For log_mood: moodScore (1-10), stressLevel (1-10), energyLevel (1-10)
    // For query_stats: period ("today"|"week"|"month"), metric ("habits"|"runs"|"mood"|"all")
  },
  "reply": "friendly short confirmation or answer, max 2 lines, use emojis"
}

Examples:
- "ran 7km in 58min HR 155" → log_run, distanceKm:7, durationMin:58, avgHr:155
- "journaled, meditated, coded 3h" → log_habits, habits:["journal","meditate","code"]
- "feeling 7/10 today, stress is high like 8" → log_mood, moodScore:7, stressLevel:8
- "drank 2.5L water" → log_water, waterL:2.5
- "today i journaled about my meeting with DG futurtech..." → log_journal, journalText:...
- "how am i doing this week?" → query_stats, period:week, metric:all
- "legs session 60min" → log_gym, sessionType:legs, durationMin:60`;

export async function parseWhatsAppMessage(text: string): Promise<ParsedMessage> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
    });

    const raw = (response.content[0] as { text: string }).text.trim();
    // Extract JSON if wrapped in code block
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, raw];
    const parsed = JSON.parse(jsonMatch[1] ?? raw) as ParsedMessage;
    return parsed;
  } catch (e) {
    console.error("Parse error:", e);
    return {
      intent: "unknown",
      data: {},
      reply: "Sorry, I didn't understand that. Try: 'ran 5km', 'journaled and meditated', or 'mood 7/10'",
    };
  }
}
