import { NextRequest, NextResponse } from "next/server";
import { parseClaudeResponse, applyResponse } from "@/lib/parser";

export async function POST(req: NextRequest) {
  const { raw } = await req.json() as { raw: string };
  const { json } = parseClaudeResponse(raw);

  if (!json) {
    await applyResponse({}, raw);
    return NextResponse.json({ tasksCreated: 0, flags: [], noJson: true });
  }

  const result = await applyResponse(json, raw);
  return NextResponse.json({ ...result, noJson: false });
}
