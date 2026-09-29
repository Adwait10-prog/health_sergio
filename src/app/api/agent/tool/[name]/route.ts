import { NextRequest, NextResponse } from "next/server";
import { hasSecret } from "@/lib/auth";
import { TOOL_BY_NAME } from "@/lib/agent/tools";

// POST /api/agent/tool/<name> — called by ElevenAgents (Jarvis) mid-conversation.
// Authenticated by the x-agent-key header (stored as an ElevenLabs workspace secret).
export async function POST(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  if (!hasSecret(req.headers.get("x-agent-key"), "AGENT_TOOL_SECRET")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { name } = await params;
  const tool = TOOL_BY_NAME.get(name);
  if (!tool) return NextResponse.json({ error: `unknown tool ${name}` }, { status: 404 });

  const args = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const started = Date.now();
  try {
    const result = await tool.run(args ?? {});
    console.log("agent tool:", { name, ms: Date.now() - started });
    return NextResponse.json({ result });
  } catch (e) {
    console.error("agent tool failed:", name, e);
    return NextResponse.json({ result: `That didn't work (${name} failed). Say so plainly.` });
  }
}
