import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/user";
import { todayUTC } from "@/lib/date";
import { draftAndSaveEod } from "@/lib/wa/intents/eod";

// POST /api/eod/draft — { notes? } → drafts today's EoD from the web (same pipeline as WhatsApp)
export async function POST(req: NextRequest) {
  try {
    const { notes } = (await req.json().catch(() => ({}))) as { notes?: string };
    const row = await draftAndSaveEod(getUserId(), todayUTC(), notes?.trim() || null, "web");
    return NextResponse.json({ ok: true, eod: row });
  } catch (e) {
    console.error("eod/draft error:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
