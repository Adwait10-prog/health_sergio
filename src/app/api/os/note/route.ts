import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// PUT /api/os/note — { key, text }
export async function PUT(req: NextRequest) {
  try {
    const { key, text } = await req.json() as { key?: string; text?: string };
    if (!key || typeof text !== "string") {
      return NextResponse.json({ ok: false, error: "key and text required" }, { status: 400 });
    }
    await db.osNote.upsert({
      where: { key },
      create: { key, text },
      update: { text },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("os/note error:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
