import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH /api/os/checklist — { listKey, itemId, done }
export async function PATCH(req: NextRequest) {
  try {
    const { listKey, itemId, done } = await req.json() as { listKey?: string; itemId?: string; done?: boolean };
    if (!listKey || !itemId || typeof done !== "boolean") {
      return NextResponse.json({ ok: false, error: "listKey, itemId, done required" }, { status: 400 });
    }
    await db.osChecklistItem.upsert({
      where: { listKey_itemId: { listKey, itemId } },
      create: { listKey, itemId, done },
      update: { done },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("os/checklist error:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
