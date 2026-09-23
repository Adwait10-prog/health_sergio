import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { todayUTC } from "@/lib/date";

// PATCH /api/eod — { final } → saves the edited version of today's EoD (what was actually posted)
export async function PATCH(req: NextRequest) {
  try {
    const { final } = (await req.json()) as { final?: string };
    if (typeof final !== "string") return NextResponse.json({ ok: false, error: "final required" }, { status: 400 });
    const existing = await db.eodUpdate.findUnique({ where: { date: todayUTC() } });
    if (!existing) return NextResponse.json({ ok: false, error: "No EoD drafted today yet" }, { status: 404 });
    const eod = await db.eodUpdate.update({ where: { date: todayUTC() }, data: { final: final.trim() || null } });
    return NextResponse.json({ ok: true, eod });
  } catch (e) {
    console.error("eod PATCH error:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
