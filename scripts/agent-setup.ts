// Creates or updates the Jarvis agent in ElevenAgents. Idempotent — rerun after changing
// tools, prompt or voice.   npx tsx --env-file=.env.local scripts/agent-setup.ts
//
// Env: ELEVENLABS_API_KEY, AGENT_TOOL_SECRET (header the webhook tools send back to us),
//      ELEVENLABS_AGENT_ID (optional — update instead of create), ELEVENLABS_VOICE_ID (optional),
//      AGENT_APP_URL (optional, default production).
import { AGENT_TOOLS, CLIENT_TOOLS } from "../src/lib/agent/tools";

const API = "https://api.elevenlabs.io/v1/convai";
const KEY = process.env.ELEVENLABS_API_KEY!;
const TOOL_SECRET = process.env.AGENT_TOOL_SECRET!;
const APP_URL = (process.env.AGENT_APP_URL ?? "https://health-sergio.vercel.app").replace(/\/$/, "");
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "onwK4e9ZLuTAKqWW03F9"; // Daniel — steady British
const LLM = process.env.ELEVENLABS_LLM ?? "claude-haiku-4-5";           // fast; try claude-sonnet-5 for depth
const TTS_MODEL = process.env.ELEVENLABS_TTS_MODEL ?? "eleven_v4_turbo";

async function el(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "xi-api-key": KEY, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path} → ${res.status}: ${text.slice(0, 800)}`);
  return text ? JSON.parse(text) : {};
}

const schema = (params: Record<string, { type: string; description: string; enum?: string[] }>, required: string[] = []) => ({
  type: "object",
  properties: Object.fromEntries(Object.entries(params).map(([k, p]) => [k, { type: p.type, description: p.description, ...(p.enum ? { enum: p.enum } : {}) }])),
  required,
});

const PROMPT = `You are Jarvis — Adwait's personal operating system, speaking with him by voice. He built you. You know his day, his numbers, his plan and his work, and you help him run all of it.

# How you speak
- This is a voice conversation. Be brief: one to three sentences unless he asks for detail. Lead with the answer.
- Calm, dry, quietly witty, British understatement. Never gushing, never salesy. No "Great question".
- Write for the ear: no lists, bullet points, markdown, emojis or URLs. Say numbers naturally ("ninety minutes a day", "seven twenty-two a kilometre", "the eighteenth of October").
- Call him Adwait occasionally, not every turn. "Sir" only as a joke.

# What you know
The briefing below is live data from his OS at the start of this conversation. Use it first.
{{briefing}}

# Tools
- Answer from the briefing when you can. Call a tool only for fresher or deeper data: get_briefing (after changes, or "where are we"), query_week, query_run, query_tasks, search_memory (past meetings, journal, tasks).
- Writes: log_metric, add_task, complete_task, save_journal, draft_eod, set_three, tick_three. If the request is explicit ("log reliance ninety", "add a task to call Rohit"), just do it, then confirm in one short sentence. If it's ambiguous, ask one question first. Never invent values.
- After any write, call refresh_view so he sees it on screen. When he asks to see or open something, call navigate.
- For draft_eod, read back the outcome line and the Next line only, not the whole update, and say it's saved.
- If a tool fails or returns nothing, say so plainly. Never make up data.
- Only state facts that are in the briefing, a tool result, or what he told you in this conversation. You don't know where he is, the weather, or general trivia about his life — don't guess. Read questions in his context: "Delhi" usually means the Delhi half marathon, "Mumbai" the Tata Mumbai Marathon.

# Judgement
- You're a chief of staff, not a yes-man. His mode rules are in the briefing (for example lights out time, research only on certain days). If he's about to break one, say so once, lightly, then help anyway.
- His floor: run before work, sleep before 22:30, three things a day written the night before. Protect those.
- Keep personal and work separate unless he connects them.`;

async function main() {
  if (!KEY || !TOOL_SECRET) throw new Error("ELEVENLABS_API_KEY and AGENT_TOOL_SECRET must be set");

  // 1. Workspace secret holding the tool key (ElevenLabs sends it as x-agent-key)
  const secrets = await el("/secrets");
  const existing = (secrets.secrets ?? []).find((s: { name: string }) => s.name === "personal_os_agent_key");
  let secretId: string = existing?.secret_id;
  if (existing) {
    await el(`/secrets/${secretId}`, { method: "PATCH", body: JSON.stringify({ type: "update", name: "personal_os_agent_key", value: TOOL_SECRET }) });
  } else {
    secretId = (await el("/secrets", { method: "POST", body: JSON.stringify({ type: "new", name: "personal_os_agent_key", value: TOOL_SECRET }) })).secret_id;
  }
  console.log("secret:", secretId);

  // 2. Tools — webhook tools hit our app; client tools run in the Jarvis panel
  const listed = await el("/tools");
  const byName = new Map<string, string>((listed.tools ?? []).map((t: { id: string; tool_config: { name: string } }) => [t.tool_config.name, t.id]));
  const toolIds: string[] = [];

  const upsertTool = async (tool_config: Record<string, unknown>) => {
    const name = tool_config.name as string;
    const id = byName.get(name);
    const res = id
      ? await el(`/tools/${id}`, { method: "PATCH", body: JSON.stringify({ tool_config }) })
      : await el("/tools", { method: "POST", body: JSON.stringify({ tool_config }) });
    toolIds.push(res.id ?? id);
    console.log(`${id ? "updated" : "created"} tool ${name}`);
  };

  for (const t of AGENT_TOOLS) {
    await upsertTool({
      type: "webhook",
      name: t.name,
      description: t.description,
      response_timeout_secs: t.name === "draft_eod" || t.name === "query_week" || t.name === "search_memory" ? 45 : 20,
      pre_tool_speech: "auto",
      api_schema: {
        url: `${APP_URL}/api/agent/tool/${t.name}`,
        method: "POST",
        request_headers: { "x-agent-key": { secret_id: secretId } },
        request_body_schema: {
          ...schema(t.params, t.required),
          description: t.description,
        },
      },
    });
  }
  for (const t of CLIENT_TOOLS) {
    await upsertTool({
      type: "client",
      name: t.name,
      description: t.description,
      expects_response: false,
      parameters: { ...schema(t.params, t.required), description: t.description },
    });
  }

  // 3. The agent
  const agent = {
    name: "Jarvis — Personal OS",
    tags: ["personal-os"],
    conversation_config: {
      agent: {
        first_message: "{{greeting}}",
        language: "en",
        dynamic_variables: { dynamic_variable_placeholders: { briefing: "(briefing unavailable)", greeting: "Evening, Adwait. What do you need?" } },
        prompt: {
          prompt: PROMPT,
          llm: LLM,
          temperature: 0.4,
          timezone: "Asia/Kolkata",
          tool_ids: toolIds,
          built_in_tools: { end_call: { name: "end_call", description: "", params: { system_tool_type: "end_call" } } },
        },
      },
      tts: { model_id: TTS_MODEL, voice_id: VOICE_ID, stability: 0.55, similarity_boost: 0.8, speed: 1.05 },
      conversation: { max_duration_seconds: 1800 },
    },
    platform_settings: {
      auth: { enable_auth: true },
      // Keep nothing on ElevenLabs' side (the workspace admins would see it). Our own copy lives in AgentConversation.
      privacy: {
        zero_retention_mode: true,
        record_voice: false,
        retention_days: -1, // required with zero retention (nothing is kept anyway)
        delete_transcript_and_pii: true,
        delete_audio: true,
        apply_to_existing_conversations: true,
      },
    },
  };

  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (agentId) {
    await el(`/agents/${agentId}`, { method: "PATCH", body: JSON.stringify(agent) });
    console.log("updated agent", agentId);
  } else {
    const res = await el("/agents/create", { method: "POST", body: JSON.stringify(agent) });
    console.log("created agent", res.agent_id);
    console.log(`\nAdd to .env.local and Vercel:  ELEVENLABS_AGENT_ID=${res.agent_id}`);
  }
}

main().catch(e => { console.error(e.message ?? e); process.exit(1); });
