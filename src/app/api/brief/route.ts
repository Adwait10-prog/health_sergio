import { NextResponse } from "next/server";
import { generateBrief } from "@/lib/brief";

export const dynamic = "force-dynamic";

export async function GET() {
  const markdown = await generateBrief();
  return NextResponse.json({ markdown });
}
