import { NextRequest, NextResponse } from "next/server";
import { buildBriefing, type SessionMode } from "@/lib/agent/briefing";

// GET /api/agent/session — behind the login gate. Returns a one-time WebRTC conversation
// token for the private Jarvis agent plus the briefing it starts with.
export async function GET(req: NextRequest) {
  const m = req.nextUrl.searchParams.get("mode");
  const mode: SessionMode = m === "morning" || m === "evening" ? m : "open";
  const key = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!key || !agentId) {
    return NextResponse.json({ error: "Jarvis isn't configured (ELEVENLABS_API_KEY / ELEVENLABS_AGENT_ID)." }, { status: 503 });
  }

  const [tokenRes, brief] = await Promise.all([
    fetch(`https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`, {
      headers: { "xi-api-key": key },
      cache: "no-store",
    }),
    buildBriefing(mode),
  ]);
  if (!tokenRes.ok) {
    console.error("agent session: token request failed", tokenRes.status);
    return NextResponse.json({ error: "Couldn't start a session with ElevenLabs." }, { status: 502 });
  }
  const { token } = (await tokenRes.json()) as { token: string };
  return NextResponse.json({ token, dynamicVariables: { briefing: brief.briefing, greeting: brief.greeting, session_mode: mode } });
}
