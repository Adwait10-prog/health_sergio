import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET — list all members
export async function GET() {
  const members = await db.asanaMember.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(members);
}

// PATCH — toggle inStandup for a member
export async function PATCH(req: NextRequest) {
  const { asanaGid, inStandup } = await req.json() as { asanaGid: string; inStandup: boolean };

  const member = await db.asanaMember.update({
    where: { asanaGid },
    data: { inStandup },
  });

  return NextResponse.json(member);
}
