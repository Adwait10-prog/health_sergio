import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Line = { role: "user" | "agent"; text: string };

// POST /api/agent/transcript — { conversationId, messages, ended? } from the Jarvis panel.
// Upserted as the conversation goes, so a closed tab still leaves a record.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { conversationId?: string; messages?: Line[]; ended?: boolean } | null;
  if (!body?.conversationId || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: "conversationId and messages required" }, { status: 400 });
  }
  const messages = body.messages
    .filter(m => (m.role === "user" || m.role === "agent") && typeof m.text === "string" && m.text.trim())
    .slice(-200);
  const userLines = messages.filter(m => m.role === "user").map(m => m.text.trim()).join(" · ") || null;
  const row = { transcript: JSON.stringify(messages), userLines, ...(body.ended ? { endedAt: new Date() } : {}) };

  await db.agentConversation.upsert({
    where: { conversationId: body.conversationId },
    create: { conversationId: body.conversationId, ...row },
    update: row,
  });
  return NextResponse.json({ ok: true });
}
